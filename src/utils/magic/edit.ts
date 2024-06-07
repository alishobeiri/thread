import useCellStore, {
	CellStatus,
} from "../../components/cell/store/CellStore";
import { useNotebookStore } from "../../components/notebook/store/NotebookStore";
import ConnectionManager from "../../services/connection/connectionManager";
import { NoterousCell } from "../../types/code.types";
import { API_URL } from "../constants/constants";
import { makeStreamingFunctionRequest } from "../streaming";
import { getAppTheme, multilineStringToString } from "../utils";

export const editCell = async (cell: NoterousCell, query: string) => {
	const setPreviousQuery = useCellStore.getState().setPreviousQuery;
	const setProposedSource = useCellStore.getState().setProposedSource;
	const setCellStatus = useCellStore.getState().setCellStatus;
	setCellStatus(cell.id as string, CellStatus.Generating);
	const stream = makeStreamingFunctionRequest({
		url: `${API_URL}/api/magic/actions/editCell`,
		method: "POST",
		payload: {
			userRequest: query,
			currentCellSource: multilineStringToString(cell.source),
			currentNamespace: ConnectionManager.getInstance().currentNamespace,
			theme: getAppTheme(),
			uniqueId: ConnectionManager.getInstance().uniqueId,
		},
		shouldCancel: () =>
			useNotebookStore.getState().userAbortedMagicQueryController.signal
				.aborted,
	});

	for await (const data of stream) {
		console.log(data);
		if (!data || !("source" in data)) {
			continue;
		}
		const source = data.source;
		setProposedSource(cell.id as string, source);
	}
	setPreviousQuery(cell.id as string, query);
	setCellStatus(cell.id as string, CellStatus.FollowUp);
};
