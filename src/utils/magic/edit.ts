import useCellStore, {
	CellStatus,
} from "../../components/cell/store/CellStore";
import { useNotebookStore } from "../../components/notebook/store/NotebookStore";
import { useSettingsStore } from "../../components/settings/SettingsStore";
import ConnectionManager from "../../services/connection/connectionManager";
import { ThreadCell } from "../../types/code.types";
import { mostRelevantCellsForQuery } from "../embeddings";
import { makeStreamingFunctionRequest } from "../streaming";
import { getAppTheme, multilineStringToString } from "../utils";

const { getServerProxyUrl } = useSettingsStore.getState();

export const editCell = async (cell: ThreadCell, query: string) => {
	const setPreviousQuery = useCellStore.getState().setPreviousQuery;
	const setProposedSource = useCellStore.getState().setProposedSource;
	const setCellStatus = useCellStore.getState().setCellStatus;
	setCellStatus(cell.id as string, CellStatus.Generating);
	const stream = makeStreamingFunctionRequest({
		url: `${getServerProxyUrl()}/api/magic/actions/editCell`,
		method: "POST",
		payload: {
			userRequest: query,
			currentCellSource: multilineStringToString(cell.source),
			currentNamespace: ConnectionManager.getInstance().currentNamespace,
			mostRelevantCellsForQuery: await mostRelevantCellsForQuery(query),
			theme: getAppTheme(),
			...useSettingsStore.getState().getAdditionalRequestMetadata(),
		},
		shouldCancel: () =>
			useNotebookStore.getState().userAbortedMagicQueryController.signal
				.aborted,
	});

	for await (const data of stream) {
		if (!data || !("source" in data)) {
			continue;
		}
		const source = data.source;
		setProposedSource(cell.id as string, source);
	}
	setPreviousQuery(cell.id as string, query);
	setCellStatus(cell.id as string, CellStatus.FollowUp);
};
