import { handleCellEdit } from "shared-thread-notebook-utils";
import useCellStore, {
	CellStatus,
} from "../../components/cell/store/CellStore";
import { useNotebookStore } from "../../components/notebook/store/NotebookStore";
import { useSettingsStore } from "../../components/settings/SettingsStore";
import ConnectionManager from "../../services/connection/connectionManager";
import { ThreadNotebookCell } from "../../types/code.types";
import { mostRelevantCellsForQuery } from "../embeddings";
import { makeStreamingJsonRequest, parseStreamWrapper } from "../streaming";
import { getAppTheme, multilineStringToString } from "../utils";

const { getServerProxyUrl } = useSettingsStore.getState();

function extractSource(data: unknown): string | null {
	if (typeof data === "object" && data !== null && "source" in data) {
		return String(data.source);
	}
	if (typeof data === "string") {
		// Extract code from fenced code blocks
		const codeMatch = data.match(/```(?:\w+)?\s*([\s\S]*?)\s*```/);
		if (codeMatch?.[1]) {
			return codeMatch[1].trim();
		}
		const trimmed = data.trim();
		return trimmed || null;
	}
	return null;
}

function resetCellState(cellId: string) {
	const { setProposedSource, setCellStatus } = useCellStore.getState();
	setProposedSource(cellId, "");
	setCellStatus(cellId, CellStatus.Initial);
}

export const editCell = async (cell: ThreadNotebookCell, query: string) => {
	const cellId = cell.id as string;
	const { setPreviousQuery, setProposedSource, setCellStatus } =
		useCellStore.getState();
	setCellStatus(cellId, CellStatus.Generating);

	const isLocal = useSettingsStore.getState().isLocal;
	const payload = {
		userRequest: query,
		currentCellSource: multilineStringToString(cell.source),
		currentNamespace: ConnectionManager.getInstance().currentNamespace,
		mostRelevantCellsForQuery: await mostRelevantCellsForQuery(query),
		theme: getAppTheme(),
		...useSettingsStore.getState().getAdditionalRequestMetadata(),
	};

	const stream = isLocal
		? parseStreamWrapper({
				streamGenerator: handleCellEdit,
				params: payload,
		  })
		: makeStreamingJsonRequest({
				url: `${getServerProxyUrl()}/api/magic/actions/editCell`,
				method: "POST",
				payload: payload,
				shouldCancel: () =>
					useNotebookStore.getState().userAbortedMagicQueryController
						.signal.aborted,
		  });

	let proposedSource: string | null = null;
	try {
		for await (const data of stream) {
			const source = extractSource(data);
			if (source) {
				proposedSource = source;
				setProposedSource(cellId, source);
			}
		}

		if (proposedSource) {
			setPreviousQuery(cellId, query);
			setCellStatus(cellId, CellStatus.FollowUp);
		} else {
			resetCellState(cellId);
		}
	} catch (error) {
		console.error("Error during edit cell stream:", error);
		resetCellState(cellId);
	}
};
