import {
	Kernel as JupyterKernel,
	KernelMessage,
	SessionManager,
} from "@jupyterlab/services";
import { ConnectionStatus } from "@jupyterlab/services/lib/kernel/kernel";
import { ISessionConnection } from "@jupyterlab/services/lib/session/session";
import { useNotebookStore } from "../../components/notebook/store/NotebookStore";
import { trackEventData } from "../../utils/posthog";
import ConnectionManager, {
	useConnectionManagerStore,
} from "../connection/connectionManager";
import KernelModel from "./KernelModel";

export class Kernel {
	private _clientId!: string;
	private _connectionStatus!: ConnectionStatus;
	private _id!: string;
	private _info!: KernelMessage.IInfoReply;
	private kernel!: JupyterKernel.IKernelConnection | null;
	private _path!: string;
	private _ready!: Promise<void>;
	private _readyResolve!: () => void;
	private _sessionId!: string;
	private _sessionManager!: SessionManager;
	private session!: ISessionConnection;
	private _kernelModel!: KernelModel;

	public constructor(session: ISessionConnection) {
		this.initReady = this.initReady.bind(this);
		this.initReady();

		this.initKernel(session);
	}

	public async initKernel(session: ISessionConnection) {
		this.session = session;
		this.kernel = session.kernel!;

		this._connectionStatus = this.kernel.connectionStatus;
		this.resolveIfConnected();
		this.kernel.connectionStatusChanged.connect((_, connectionStatus) => {
			this._connectionStatus = connectionStatus;
			this.resolveIfConnected();
		});

		this.session.statusChanged.connect(() => {
			useConnectionManagerStore
				.getState()
				.setKernelStatus(this.session.kernel?.status ?? "unknown");
		});

		this._kernelModel = new KernelModel(session);
	}

	private resolveIfConnected() {
		if (this._connectionStatus === "connected") {
			this._readyResolve();
		}
	}

	private initReady() {
		this._ready = new Promise((resolve, _) => {
			this._readyResolve = resolve;
		});
	}

	get ready(): Promise<void> {
		return this._ready;
	}

	get clientId(): string {
		return this._clientId;
	}

	get id(): string {
		return this._id;
	}

	get sessionId(): string {
		return this._sessionId;
	}

	get info(): KernelMessage.IInfoReply {
		return this._info;
	}

	get sessionManager(): SessionManager {
		return this._sessionManager;
	}

	get path(): string {
		return this._path;
	}

	toJSON() {
		return {
			path: this._path,
			id: this.id,
			clientId: this.clientId,
			sessionId: this.sessionId,
			kernelInfo: this.info,
		};
	}

	toString() {
		return `id:${this.id} - client_id:${this.clientId} - session_id:${this.sessionId} - path:${this._path}`;
	}

	refreshConnection = async () => {
		if (this._connectionStatus == "disconnected") {
			const kernelSpec = await this.kernel?.spec;

			// Kernel has been disposed due to timeout refresh it
			const session = await ConnectionManager.getInstance().getNewSession(
				{
					kernelSelection: kernelSpec?.name,
				},
			);
			if (session) {
				this.initKernel(session);
			}
		}
	};

	async prepareExecution() {
		await this.ready;
		await this.refreshConnection();
	}

	execute = async (cellIds: string[]) => {
		await this.prepareExecution();
		return this._kernelModel.execute(cellIds);
	};

	silentExecute = async (
		code: string,
		callback: (msg: KernelMessage.IIOPubMessage) => void,
	) => {
		await this.prepareExecution();
		this._kernelModel.silentExecute(code, callback);
	};

	shutdown() {
		return (
			this.session?.kernel?.shutdown().then(() => {
				this.kernel?.dispose();
			}) ?? Promise.resolve()
		);
	}

	restart() {
		return (
			this.session.kernel?.restart().finally(() => {
				// Reset the namespace anytime the kernel is restarted
				ConnectionManager.getInstance().currentNamespace = "";
			}) ?? Promise.resolve()
		);
	}

	interrupt() {
		useNotebookStore.getState().setExecutingCells([]);
		trackEventData("[KERNEL] interrupted kernel");
		if (this._kernelModel) {
			this._kernelModel.interruptKernel();
		}
	}
}

export default Kernel;
