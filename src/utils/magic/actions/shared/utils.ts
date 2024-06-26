import {
	StreamWrapperParams,
	makeStreamingJsonRequest,
	parseStreamWrapper,
} from "../../../streaming";
import { ActionState } from "../../magicQuery";

export async function* sharedAction(
	actionState: ActionState,
	wasAborted: () => boolean,
	actionUrl: string,
	cellType: string,
): AsyncGenerator<any, void, unknown> {
	const stream = makeStreamingJsonRequest({
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

interface Cell {
	cell_type?: string;
	source?: string;
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

	for await (let data of stream) {
		data = data.trim();

		let extractedData = data;
		const codeMatch = data.match(/```(?:python)?\s*[\s\S]*?\s*```/);
		if (codeMatch) {
			extractedData = codeMatch[0]
				.replace(/^```(?:python)?\s*/, "")
				.replace(/\s*```$/, "");
		}

		const cells: Cell[] = [
			{
				cell_type: cellType,
				source: extractedData,
			},
		];

		yield { cells };
	}
}
