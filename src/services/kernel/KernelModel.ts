import { IOutput } from "@jupyterlab/nbformat";
import { Kernel, KernelMessage } from "@jupyterlab/services";
import {
	IFuture,
	IKernelConnection,
} from "@jupyterlab/services/lib/kernel/kernel";
import {
	IExecuteReplyMsg,
	IExecuteRequestMsg,
} from "@jupyterlab/services/lib/kernel/messages";
import { ISessionConnection } from "@jupyterlab/services/lib/session/session";
import { PartialJSONObject } from "@lumino/coreutils/types";
import { ISignal, Signal } from "@lumino/signaling";
import { captureException } from "@sentry/nextjs";
import { useNotebookStore } from "../../components/notebook/store/NotebookStore";
import { ThreadCell } from "../../types/code.types";
import { multilineStringToString } from "../../utils/utils";
import TextEmbeddingModel from "../embedding/TextEmbedder";

export class KernelModel {
	// Initialize an empty queue
	taskQueue = Promise.resolve();
	queueCleared = false;

	constructor(session: ISessionConnection) {
		this.session = session;
		this.kernel = session.kernel;
	}

	get future(): Kernel.IFuture<
		KernelMessage.IExecuteRequestMsg,
		KernelMessage.IExecuteReplyMsg
	> | null {
		return this._future;
	}

	set future(
		value: Kernel.IFuture<
			KernelMessage.IExecuteRequestMsg,
			KernelMessage.IExecuteReplyMsg
		> | null,
	) {
		this._future = value;
		if (!value) {
			return;
		}
		value.onIOPub = this._onIOPub;
		value.onReply = this._onReply;
		value.onStdin = (msg) => {
			console.log("onStdin: ", msg);
		};
	}

	set cellId(index: string) {
		this._currentlyProcessingCellId = index;
	}

	get cellId(): string {
		return this._currentlyProcessingCellId ?? "";
	}

	set cell(cell: ThreadCell) {
		this._currentlyProcessingCell = cell;
	}

	get cell(): ThreadCell | null | undefined {
		return this._currentlyProcessingCell;
	}

	get output(): IOutput | null {
		return this._output;
	}

	get stateChanged(): ISignal<KernelModel, void> {
		return this._stateChanged;
	}

	get cellMetadata(): PartialJSONObject {
		if (!this.cell) {
			return {};
		}

		if (!this.cell.metadata) {
			this.cell.metadata = {};
		}

		if (!this.cell.metadata["thread"]) {
			this.cell.metadata["thread"] = {};
		}
		return this.cell.metadata["thread"] as PartialJSONObject;
	}

	clearQueue(): void {
		this.queueCleared = true;
		this.taskQueue = this.taskQueue.then(() => {
			this.queueCleared = false;
			return Promise.resolve();
		});
	}

	execute(cellIds: string[]): Promise<void> {
		if (!this.session?.kernel) {
			return Promise.resolve();
		}

		for (const cellId of cellIds) {
			const { cells, getCellIndexById } = useNotebookStore.getState();
			const index = getCellIndexById(cellId);
			const cell = cells[index];
			if (!cell || !cell.source) continue;
			const code = multilineStringToString(cell.source);

			this._clearCellOutputs(cellId);
			this._addCellExecuting(cellId);

			// Add the task to the queue
			this.taskQueue = this.taskQueue.then(async () => {
				if (!this.kernel) {
					return;
				}

				// If the queue has been cleared, then skip this task.
				if (this.queueCleared) {
					this._removeExecutingCell(cellId);
					return;
				}

				// Set the currently processing cell to be able to edit it's outputs in the listener
				this.cell = cell;
				this.cellId = cell.id as string;

				this.preProcessCellExecutionOperations(code);

				this.future =
					this.kernel?.requestExecute({
						code,
					}) ?? null;

				this.cellMetadata["ran"] = true;
				try {
					await this.future?.done;
					await this.postCellExecutionOperations(cell);
				} catch (error) {
					captureException(error);
					console.error(error);
				}
			});
		}

		// Return a promise that resolves when all cell executions within this invocation have completed
		return this.taskQueue;
	}

	preProcessCellExecutionOperations(code: string): void {}

	async postCellExecutionOperations(
		cell: ThreadCell,
	): Promise<(IFuture<IExecuteRequestMsg, IExecuteReplyMsg> | null)[]> {
		// Used to capture the current variables in the execution state
		if (!this.kernel) {
			return Promise.all([]);
		}
		const code = multilineStringToString(cell.source);
		try {
			this.cellMetadata["embedding"] =
				TextEmbeddingModel.getInstance().embed(
					code,
				) as any as PartialJSONObject;
		} catch (error) {
			console.error(error);
		}

		return Promise.all([]);
	}

	silentExecute(
		code: string,
		callback: (msg: KernelMessage.IIOPubMessage) => void,
	): Kernel.IFuture<
		KernelMessage.IExecuteRequestMsg,
		KernelMessage.IExecuteReplyMsg
	> | null {
		if (!this.kernel) {
			return null;
		}

		const future = this.kernel.requestExecute({
			code,
			silent: true,
			store_history: false,
		});

		future.onIOPub = callback;
		return future;
	}

	interruptKernel(): void {
		if (!this.kernel) {
			return;
		}

		this.clearQueue();
		this.kernel.interrupt();
	}

	private _onIOPub = (msg: KernelMessage.IIOPubMessage): void => {
		const msgType = msg.header.msg_type;

		switch (msgType) {
			case "execute_result":
			case "display_data":
			case "stream":
			case "error":
				this._addCellOutput(this.cellId, {
					output_type: msgType,
					...msg.content,
				});
				break;
			case "clear_output":
				this._clearCellOutputs(this.cellId);
				break;
			case "update_display_data":
				this._output = msg.content as IOutput;
				this._stateChanged.emit();
				break;
			default:
				break;
		}
		return;
	};

	private _onReply = (msg: KernelMessage.IExecuteReplyMsg): void => {
		const msgType = msg.header.msg_type;
		switch (msgType) {
			case "execute_reply":
				this._removeExecutingCell(this.cellId);
				if (!msg.content.execution_count) {
					this._setExecutionCount(this.cellId, null);
				} else {
					this._setExecutionCount(
						this.cellId,
						msg.content.execution_count!,
					);
				}
				break;
			default:
				break;
		}
		return;
	};

	private _future: Kernel.IFuture<
		KernelMessage.IExecuteRequestMsg,
		KernelMessage.IExecuteReplyMsg
	> | null = null;

	private _silentFuture: Kernel.IFuture<
		KernelMessage.IExecuteRequestMsg,
		KernelMessage.IExecuteReplyMsg
	> | null = null;

	private _addCellExecuting = useNotebookStore.getState().addExecutingCell;
	private _removeExecutingCell =
		useNotebookStore.getState().removeExecutingCell;
	private _setExecutionCount = useNotebookStore.getState().setExecutionCount;
	private _clearCellOutputs = useNotebookStore.getState().clearCellOutputs;
	private _addCellOutput = useNotebookStore.getState().addCellOutput;

	// Currently processing cell
	private _currentlyProcessingCell: ThreadCell | null | undefined;
	private _currentlyProcessingCellId: string | undefined;
	private _output: IOutput | null = null;
	private session: ISessionConnection;
	private kernel: IKernelConnection | null;
	private _stateChanged = new Signal<KernelModel, void>(this);
}

export default KernelModel;
