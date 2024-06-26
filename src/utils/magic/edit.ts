import { handleCellEdit } from "shared-thread-utils";
import useCellStore, {
	CellStatus,
} from "../../components/cell/store/CellStore";
import { useNotebookStore } from "../../components/notebook/store/NotebookStore";
import { useSettingsStore } from "../../components/settings/SettingsStore";
import ConnectionManager from "../../services/connection/connectionManager";
import { ThreadCell } from "../../types/code.types";
import { mostRelevantCellsForQuery } from "../embeddings";
import { makeStreamingJsonRequest, parseStreamWrapper } from "../streaming";
import { getAppTheme, multilineStringToString } from "../utils";

const { getServerProxyUrl } = useSettingsStore.getState();

export const editCell = async (cell: ThreadCell, query: string) => {
	const setPreviousQuery = useCellStore.getState().setPreviousQuery;
	const setProposedSource = useCellStore.getState().setProposedSource;
	const setCellStatus = useCellStore.getState().setCellStatus;
	setCellStatus(cell.id as string, CellStatus.Generating);

	const isLocal = useSettingsStore.getState().isLocal();
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

	for await (let data of stream) {
		if (data && typeof data === "object" && "source" in data) {
			setProposedSource(cell.id as string, data.source);
		} else if (typeof data === "string") {
			const codeMatch = data.match(/```(?:python)?\s*[\s\S]*?\s*```/);
			if (codeMatch) {
				const extractedData = codeMatch[0]
					.replace(/^```(?:python)?\s*/, "")
					.replace(/\s*```$/, "");
				setProposedSource(cell.id as string, extractedData.trim());
			} else {
				setProposedSource(cell.id as string, data.trim());
			}
		}
	}

	setPreviousQuery(cell.id as string, query);
	setCellStatus(cell.id as string, CellStatus.FollowUp);
};
