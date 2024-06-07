import { useOpenAISettingsModalStore } from "../../../../components/modals/openai-settings/OpenAISettingsModalStore";
import ConnectionManager from "../../../../services/connection/connectionManager";
import { makeStreamingFunctionRequest } from "../../../streaming";
import { ActionState } from "../../magicQuery";

export async function* sharedAction(
	actionState: ActionState,
	wasAborted: () => boolean,
	actionUrl: string,
	cellType: string,
): AsyncGenerator<any, void, unknown> {
	const stream = makeStreamingFunctionRequest({
		url: actionUrl,
		method: "POST",
		payload: {
			actionState: actionState,
			uniqueId: ConnectionManager.getInstance().uniqueId,
			openaiApiKey: useOpenAISettingsModalStore.getState().openAIKey,
		},
		shouldCancel: wasAborted,
	});

	for await (const data of stream) {
		if (!data || !("cells" in data) || !data.cells) {
			continue;
		}

		const cells = data.cells
			.map((sourceObj: any) => {
				if (typeof sourceObj === "string") {
					return {
						cell_type: cellType,
						source: sourceObj,
					};
				} else if (
					typeof sourceObj === "object" &&
					"source" in sourceObj
				) {
					let source = sourceObj.source;
					while (
						typeof source === "object" &&
						source != null &&
						"source" in source
					) {
						source = source.source;
					}

					return {
						cell_type: cellType,
						source: sourceObj.source,
					};
				}
			})
			.filter((cell: any) => cell && cell.source);
		yield { cells };
	}
}
