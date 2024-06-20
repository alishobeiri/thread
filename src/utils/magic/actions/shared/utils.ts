import {
	StreamWrapperParams,
	makeStreamingFunctionRequest,
	parseStreamWrapper,
} from "../../../streaming";
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

interface StreamWrapperParamsWithCellType<P> extends StreamWrapperParams<P> {
	cellType: string;
}

export async function* sharedLocalAction<P>({
	streamGenerator,
	params,
	shouldCancel = () => false,
	cellType,
}: StreamWrapperParamsWithCellType<P>): AsyncGenerator<any, void, unknown> {
	const stream = parseStreamWrapper({
		streamGenerator,
		params,
		shouldCancel,
	});

	for await (const data of stream) {
		console.log("Data: ", data);

		let trimmedData = data;
		const backtickBlockRegex = /^```([\s\S]*?)```$/;
		const match = data.match(backtickBlockRegex);

		if (match) {
			trimmedData = match[1]; // Capture text inside the triple backticks
		} else {
			trimmedData = data.replace(/^```|```$/g, ""); // Remove leading or trailing backticks if present
		}

		const cells = [
			{
				cell_type: cellType,
				source: trimmedData,
			},
		];

		yield { cells };
	}
}
