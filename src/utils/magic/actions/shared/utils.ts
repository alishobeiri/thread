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
		let cells = [];

		// Check for JSON objects with 'cell_type' and 'source'
		const jsonMatch = data.match(
			/\{[\s\S]*?"cell_type"\s*:\s*".*?",\s*"source"\s*:\s*"((?:\\.|[\s\S])*?)"[\s\S]*?\}/
		);
		if (jsonMatch) {
			try {
				const jsonObject = JSON.parse(jsonMatch[0]);
				cells.push(jsonObject);
			} catch (error) {
				console.error("Failed to parse JSON:", error);

				// Extract the "source" value from the matched JSON string
				const sourceMatch = jsonMatch[0].match(
					/"source"\s*:\s*"([^"]*)"/,
				);
				if (sourceMatch && sourceMatch[1]) {
					cells.push({
						cell_type: cellType,
						source: sourceMatch[1],
					});
				}
			}
		}

		// Improved regex to capture any fenced code block optionally with a language specifier
		const codeMatch = data.match(/```(?:\w+)?\s*([\s\S]*?)\s*```/);

		if (codeMatch && codeMatch[1]) {
			const extractedData = codeMatch[1].trim();
			if (extractedData) {
				cells.push({
					cell_type: cellType,
					source: extractedData,
				});
			}
		}

		if (cells.length === 0 && data) {
			// Fallback to adding the raw data if no JSON or code block is found
			cells.push({
				cell_type: cellType,
				source: data,
			});
		}

		yield { cells };
	}
}
