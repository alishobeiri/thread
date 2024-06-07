import { captureException } from "@sentry/nextjs";
import useCellStore from "../../components/cell/store/CellStore";
import {
	MagicInputSelections,
	useMagicInputStore,
} from "../../components/input/MagicInputStore";
import { useNotebookStore } from "../../components/notebook/store/NotebookStore";
import { useChatStore } from "../../components/sidebar/chat/store/ChatStore";
import ConnectionManager from "../../services/connection/connectionManager";
import { MESSAGES_LOOKBACK_WINDOW } from "../constants/constants";
import { trackEventData } from "../posthog";
import {
	getAppTheme,
	getNoterousCellMetadata,
	newUuid,
	noterousFetch,
} from "../utils";
import { getAction, getActionInfo } from "./actionUtils";
import { codeAction } from "./actions/code";
import { fixErrorAction } from "./actions/fixError";
import { editCell } from "./edit";
import {
	NoterousMessage,
	formatCellsAsMessages,
	getLastNMessages,
} from "./messages";

// Keeps track of all the action states that
export type ActionState = {
	userRequest: string;
	prevMessages: NoterousMessage[];
	messagesAfterQuery: NoterousMessage[];
	firstQuery: boolean;

	// The index where cell generation has begun
	initialCellGenerationIndex: number;

	// Where we are in the index of cells being generated
	currentCellGenerationIndex: number;
	currentNamespace: string;

	// The cell grouping for the magic query
	group: string;
	theme: "light" | "dark";

	// List of actions in the order that they occurred
	prevActions: any[];
};

const getCells = () => useNotebookStore.getState().cells;

type Actions = {
	[key: string]: (
		actionState: ActionState,
		wasAborted: () => boolean,
	) => AsyncGenerator<any, void, unknown>;
};

const actions: Actions = {
	code: codeAction,
	fixError: fixErrorAction,
};

const executeAction = async (
	actionName: keyof Actions,
	actionState: ActionState,
	wasAborted: () => boolean,
): Promise<any> => {
	const action = actions[actionName];
	if (actionName == "stop") {
		return;
	}

	if (!action) {
		console.warn("Unknown action");
		return;
	}

	// Streams can be aborted by users or programmatically by the agents themselves
	// A stream may be terminated if for example an error is encountered during execution
	const streamAbortController = new AbortController();
	const wasStreamAbortedOrGenerationAborted = () => {
		return wasAborted() || streamAbortController.signal.aborted;
	};

	const stream = await action(
		actionState,
		wasStreamAbortedOrGenerationAborted,
	);

	await processStream(
		stream,
		actionState,
		streamAbortController,
		wasAborted,
		actionName,
	);
};

export const processStream = async (
	stream: AsyncGenerator<any, void, unknown>,
	actionState: ActionState,
	streamAbortController: AbortController,
	wasAborted: () => boolean,
	actionName: string | number,
) => {
	// Extract necessary functions from the global state
	const { executeCell, addCellAtIndex, setCellSource } =
		useNotebookStore.getState();

	const originalCellLength = getCells().length;
	const group = actionState.group;

	// Copy the cell generation index so we can update it in the action state
	const cellGenerationIndex = actionState.currentCellGenerationIndex;
	let index = 0;
	let cells = getCells();
	let generatedCellLength = 0;
	for await (const data of stream) {
		if (wasAborted() || streamAbortController.signal.aborted) {
			break;
		}

		// Skip if data is not in expected format or no new cells to process
		if (!(data && data.cells)) {
			continue;
		}

		const generatedCells = data.cells; // Extract generated cells from data
		const generatedLength = generatedCells.length; // Number of new cells
		generatedCellLength = Math.max(generatedCellLength, generatedLength);

		// Process each generated cell starting from the last index processed
		for (let i = index; i < generatedLength; i++) {
			if (wasAborted() || streamAbortController.signal.aborted) {
				break;
			}
			// Refresh local cells state to ensure it's up-to-date
			cells = getCells();

			// Calculate the actual index in the notebook for the new/updated cell
			const cellEditIndex = i + cellGenerationIndex;

			// Extract the cell to be processed
			const generatedCell = generatedCells[i];

			// Skip if the cell is not in expected format
			if (
				!(
					generatedCell &&
					generatedCell.cell_type &&
					generatedCell.source
				)
			) {
				continue;
			}

			// Extract type and source from the generated cell
			const cellType = generatedCell.cell_type;
			const cellSource = generatedCell.source;

			// If the cell index is beyond the current notebook length, add new cell
			if (cellEditIndex > cells.length - 1) {
				addCellAtIndex(
					cellEditIndex,
					cellSource,
					cellType,
					cellType === "markdown" ? "command" : "edit",
					group,
					"assistant",
					actionName as string,
				);
			} else {
				// For existing cells, update the source content
				const cell = cells[cellEditIndex];
				const id = cell.id as string;
				const metadata = getNoterousCellMetadata(cell);
				if (metadata.group != group) {
					// Processing a cell that belongs to a new group, add a new cell to extend the current group instead
					addCellAtIndex(
						cellEditIndex,
						cellSource,
						cellType,
						cellType === "markdown" ? "command" : "edit",
						group,
						"assistant",
						actionName as string,
					);
				} else if (id) {
					setCellSource(id, cellSource);
				} else {
					console.warn("No id for cell: ", cell);
				}

				// If there's another cell after the current cell you are processing, it means the current cell is completed
				const anotherCompletedCellAfterCurrent =
					generatedLength - 1 > i;
				if (anotherCompletedCellAfterCurrent) {
					index += 1;
					const cellToExecute = getCells()[cellEditIndex];
					await executeCell(cellToExecute.id as string);
				}

				actionState.currentCellGenerationIndex = cellEditIndex;
			}

			useNotebookStore.setState({ addedGeneratedCell: true });

			console.log("cellEditIndex: ", cellEditIndex);
		}
	}

	const finalCellLength = getCells().length;
	if (
		!wasAborted() &&
		!streamAbortController.signal.aborted &&
		originalCellLength !== finalCellLength
	) {
		// Execute the last cell in the sequence
		const cellEditIndex = cellGenerationIndex + generatedCellLength - 1;
		const cellToExecute = getCells()[cellEditIndex];
		await executeCell(cellToExecute.id as string);
		actionState.currentCellGenerationIndex = cellEditIndex + 1;
	}
};

export const getActionState = async ({
	query,
	firstQuery,
	actionState,
	group,
}: {
	query?: string;
	firstQuery?: boolean;
	actionState?: ActionState;
	group?: string;
}) => {
	const get = useNotebookStore.getState;

	let initialCellGenerationIndex =
		actionState?.initialCellGenerationIndex ?? get().activeCellIndex + 1;
	const currentCellGenerationIndex =
		actionState?.currentCellGenerationIndex ?? initialCellGenerationIndex;

	const cellsGeneratedSoFar = getCells().slice(
		initialCellGenerationIndex,
		currentCellGenerationIndex,
	);

	const messagesAfterQuery = formatCellsAsMessages(
		cellsGeneratedSoFar,
		cellsGeneratedSoFar.length,
		// Limits the strings that are produced as part of the messages, reduces token count usage but potentially reduces accuracy
		true,
		initialCellGenerationIndex,
	);

	console.log("messagesAfterQuery: ", messagesAfterQuery);

	const prevMessages =
		actionState?.prevMessages ??
		getLastNMessages(
			MESSAGES_LOOKBACK_WINDOW,
			true,
			currentCellGenerationIndex - 2,
		);
	const updatedActionState: ActionState = {
		userRequest: actionState?.userRequest ?? `${query}`,
		theme: getAppTheme() as "light" | "dark",
		prevMessages: prevMessages,
		messagesAfterQuery: messagesAfterQuery,
		currentNamespace: ConnectionManager.getInstance().currentNamespace,
		group: actionState?.group ?? group ?? newUuid(),
		firstQuery: firstQuery ?? false,
		initialCellGenerationIndex: initialCellGenerationIndex,
		currentCellGenerationIndex: currentCellGenerationIndex,
		prevActions: actionState?.prevActions ?? [],
	};

	console.debug("Action State: ", updatedActionState);

	return updatedActionState;
};

export const magicQuery = async (query: string, followUpRetries = 10) => {
	const get = useNotebookStore.getState;
	const set = useNotebookStore.setState;
	const getCellStore = useCellStore.getState;
	const getMagicState = useMagicInputStore.getState;
	const getChatState = useChatStore.getState;
	const option = getMagicState().selectedOption;

	set({ isGeneratingCells: true });
	if (option == MagicInputSelections.Generate) {
		await generateCells(query, followUpRetries);
	} else if (option == MagicInputSelections.Edit) {
		await editCell(useNotebookStore.getState().getActiveCell(), query);
	} else if (option == MagicInputSelections.FollowUp) {
		const activeCell = get().getActiveCell();
		const cellState = getCellStore().cellStates[activeCell.id as string];
		await editCell(
			useNotebookStore.getState().getActiveCell(),
			cellState.previousQuery?.trim() + "; " + query,
		);
	} else if (option == MagicInputSelections.Chat) {
		await getChatState().askChatAssistant(query);
	}
	set({ isGeneratingCells: false });
};

const generateCells = async (query: string, followUpRetries: number) => {
	const get = useNotebookStore.getState;
	const set = useNotebookStore.setState;

	set({ isGeneratingCells: true });

	query = query.trim();
	const group = newUuid();
	let actionState = await getActionState({
		query,
		firstQuery: true,
		group: group,
	});

	const wasAborted = () =>
		get().userAbortedMagicQueryController.signal.aborted;

	const magicQueryStartTimestamp = Date.now();

	let numberOfActions = 0;
	for (let i = 0; i < followUpRetries; i++) {
		if (wasAborted()) {
			break;
		}
		const fetchAction = await noterousFetch(
			`${
				ConnectionManager.getInstance().serverUrl
			}/thread/api/magic/actions/action`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					actionState: actionState,
				}),
			},
			get().userAbortedMagicQueryController.signal,
		);

		try {
			const action = await fetchAction.json();
			const actionStr = getAction(action);
			const actionInfo = getActionInfo(action);
			console.debug("actionStr: ", actionStr);
			console.debug("actionInfo: ", actionInfo);
			if (actionStr == "stop") {
				break;
			}

			// Run the action the agent has perscribed
			await executeAction(actionStr, actionState, wasAborted);

			// We update the action state for the next step, therefore we use i + 1
			actionState = await getActionState({
				query,
				firstQuery: i + 1 == 0,
				actionState,
			});
			actionState.prevActions.push(actionStr);
		} catch (e) {
			console.error(e);
			captureException(e);
			break;
		}
		numberOfActions = i;
	}

	trackEventData("[MagicQuery] Query Count", {
		// The indices are 0-based so add one
		queryCount: numberOfActions + 1,
	});

	set({ isGeneratingCells: false });
};
