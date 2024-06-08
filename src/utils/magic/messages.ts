import { IError, IOutput, IStream } from "@jupyterlab/nbformat";
import { captureException } from "@sentry/nextjs";
import { useNotebookStore } from "../../components/notebook/store/NotebookStore";
import ConnectionManager from "../../services/connection/connectionManager";
import { ThreadCell } from "../../types/code.types";
import { MAX_OUTPUT_LENGTH } from "../constants/constants";
import {
	extractErrorLineWithRegex,
	getThreadCellMetadata,
	limitStringLength,
	multilineStringToString,
	removeAnsiEscapeSequences,
	stringifyWithoutStringValues,
} from "../utils";

export type ThreadMessage = {
	role: "system" | "user" | "assistant";
	content: string;
};

// Define a function to merge sequential strings and interleave non-string outputs
const mergeAndInterleaveOutputs = (outputs: any[]): any[] => {
	const mergedOutputs: any[] = [];
	let currentString = "";

	outputs.forEach((output) => {
		if (typeof output === "string") {
			// If the current output is a string, append it to the currentString
			currentString += (currentString ? "\n" : "") + output;
		} else {
			// If the current output is not a string, push the currentString if it's not empty
			if (currentString) {
				mergedOutputs.push(currentString);
				currentString = ""; // Reset currentString
			}
			// Push the non-string output
			mergedOutputs.push(output);
		}
	});

	// Push the last currentString if it's not empty
	if (currentString) {
		mergedOutputs.push(currentString);
	}

	return mergedOutputs;
};

const getOutputType = (obj: any) => {
	for (let key in obj.data) {
		if (key.includes("plotly") || key.includes("image")) {
			return "Graph / Image Displayed to User";
		}

		if (Array.isArray(obj.data[key])) {
			for (let value of obj.data[key]) {
				if (
					typeof value === "string" &&
					(value.includes("<script") ||
						value.includes("define('plotly'"))
				) {
					return "";
				}
			}
		} else if (
			typeof obj.data[key] === "string" &&
			(obj.data[key].includes("<script") ||
				obj.data[key].includes("define('plotly'"))
		) {
			return "";
		}
	}

	if ("text/plain" in obj.data) {
		let textData = obj.data["text/plain"];
		if (Array.isArray(textData)) {
			textData = textData.join("\n");
		}
		return textData;
	} else if ("text/html" in obj.data) {
		let htmlData = obj.data["text/html"];
		if (Array.isArray(htmlData)) {
			htmlData = htmlData.join("\n");
		}
		return htmlData;
	}

	let defaultData = obj.data;
	if (Array.isArray(defaultData)) {
		defaultData = defaultData.join("\n");
	}
	return defaultData;
};

const preprocessCellOutputs = (outputs: IOutput[]): IOutput[] => {
	const combinedOutputs: IOutput[] = [];
	let currentStdoutText = "";

	outputs.forEach((output) => {
		if (output.output_type === "stream" && output.name === "stdout") {
			// Append the current text with a newline character if it's not empty
			currentStdoutText += (currentStdoutText ? "\n" : "") + output.text;
		} else {
			if (currentStdoutText) {
				// Push the combined stdout text as a single output
				combinedOutputs.push({
					output_type: "stream",
					name: "stdout",
					text: currentStdoutText,
				});
				currentStdoutText = ""; // Reset the current stdout text
			}
			combinedOutputs.push(output); // Push non-stdout or different stream type outputs
		}
	});

	// Check if there is any remaining stdout text that needs to be pushed
	if (currentStdoutText) {
		combinedOutputs.push({
			output_type: "stream",
			name: "stdout",
			text: currentStdoutText,
		});
	}

	return combinedOutputs;
};

export const formatCellOutputs = (cell: ThreadCell) => {
	const cellOutputs: IOutput[] = preprocessCellOutputs(
		cell.outputs as IOutput[],
	);

	return (cellOutputs as IOutput[]).map((output: IOutput) => {
		if (
			output.output_type == "display_data" ||
			output.output_type == "execute_result"
		) {
			const sanitizedOutput = sanitizeOutput(output);
			return {
				output: getOutputType(sanitizedOutput),
				errorOccurred: false,
			};
		} else if (output.output_type == "stream") {
			let data = multilineStringToString((output as IStream).text);
			return {
				output: data,
				errorOccurred: false,
			};
		} else if (output.output_type == "error") {
			const error = output as IError;

			const joinedTraceback = error.traceback
				.map((traceback) => removeAnsiEscapeSequences(traceback))
				.join("\n");

			const erroredLine =
				extractErrorLineWithRegex(joinedTraceback) ??
				"<error fetching line>";
			return {
				output: {
					error: error.ename + ": " + error.evalue,
					line_that_errored: erroredLine,
				},
				errorOccurred: true,
			};
		}

		const sanitizedData = sanitizeOutput(output.data);
		return { output: sanitizedData as any, errorOccurred: false };
	});
};

const sanitizeOutput = (output: any): any => {
	if (typeof output === "string") {
		return output.includes("<script") ? "" : output;
	}

	const sanitizedData: Record<string, any> = {};
	for (const key in output.data) {
		const value = output.data[key];
		sanitizedData[key] =
			typeof value === "string" && value.includes("<script") ? "" : value;
	}

	return {
		...output,
		data: sanitizedData,
	};
};

const postProcessMessages = (messages: ThreadMessage[]): ThreadMessage[] => {
	// Filter out empty messages
	return messages.filter((message) => message.content.trim() !== "");
};

export const formatCellsAsMessages = (
	cells: ThreadCell[],
	n: number,
	limitChars = false,
	startIndex?: number,
	asExchanges = false,
): ThreadMessage[] => {
	let messagesRemaining = n;
	let prevCell = null;
	let previousCellExecutedCorrectly = false;

	const connectionManager = ConnectionManager.getInstance();
	const messages: ThreadMessage[] = [];
	const initialIndex =
		startIndex !== undefined
			? Math.min(startIndex, cells.length - 1)
			: cells.length - 1;

	for (let i = initialIndex; i >= 0 && messagesRemaining > 0; i--) {
		try {
			const cell = cells[i];
			const type = cell.cell_type;
			const source = multilineStringToString(cell.source);
			const threadMetadata = getThreadCellMetadata(cell);

			const sameAsPrevCell = prevCell && prevCell.source === source;
			if (sameAsPrevCell) {
				// Skip this cell if it is the same as the previous cell, caused by model repetition
				continue;
			}

			if (type === "markdown" && threadMetadata.user === "user") {
				// Reset the error tracking for markdown cells
				previousCellExecutedCorrectly = false;
				messages.unshift({
					role: "user",
					content: source.trim(),
				});
				// Decrement messagesRemaining only if `we are considering exchanges
				if (asExchanges) {
					messagesRemaining -= 1;
				}
			} else if (source.length > 0) {
				const outputs = formatCellOutputs(cell);
				const executed =
					cell.execution_count != null || outputs.length > 0;
				const errorOccurred = outputs.some(
					(output) => output.errorOccurred,
				);

				if (executed && !errorOccurred) {
					// Skip this cell if it has an error and the previous cell also had an error
					previousCellExecutedCorrectly = true;
				}

				if (errorOccurred && previousCellExecutedCorrectly) {
					// Skip this cell as it has an error and the cell that came after it was executed correctly
					continue;
				}

				if (executed || errorOccurred) {
					// Concatenate all outputs into a single string separated by newlines
					const filteredOutputs = outputs
						.map((output) => output.output)
						.filter(
							(output) =>
								output != null &&
								output !== "" &&
								!(Array.isArray(output) && output.length === 0),
						);

					// Usage example with the 'filteredOutputs' array
					const mergedAndInterleavedOutputs =
						mergeAndInterleaveOutputs(filteredOutputs);

					// Now you can limit each output individually as needed
					const finalOutput = mergedAndInterleavedOutputs
						.map((output) => {
							if (typeof output === "string") {
								// Limit the string output
								return limitStringLength(
									output,
									MAX_OUTPUT_LENGTH /
										mergedAndInterleavedOutputs.length,
								);
							} else if (output.errorOccurred) {
								// Limit the error string
								output.output.error = limitStringLength(
									output.output.error,
									MAX_OUTPUT_LENGTH /
										mergedAndInterleavedOutputs.length,
								);
							}

							if (typeof output == "object") {
								output = JSON.stringify(output, null);
							}

							return output;
						})
						.join("\n")
						.trim();

					const assistantMessageContent: any = {
						code_executed: true,
						error_occurred: errorOccurred,
						outputs: finalOutput,
					};

					messages.unshift({
						role: "assistant",
						content: stringifyWithoutStringValues(
							assistantMessageContent,
						),
					});
				}

				messages.unshift({
					role: "assistant",
					content: stringifyWithoutStringValues({
						cell_type: type,
						source: source,
					}),
				});

				if (type != "code" && previousCellExecutedCorrectly) {
					// Reset the error tracking as we encountered a non-code cell
					previousCellExecutedCorrectly = false;
				}
			}
			if (!asExchanges) {
				messagesRemaining -= 1;
			}
			prevCell = cell;
		} catch (e) {
			console.error(e);
			captureException(e);
		}
	}

	// Post-processing and returning the messages
	return postProcessMessages(messages);
};

export const getLastNMessages = (
	n: number,
	limitChars = false,
	startIndex?: number,
	asExchanges = false,
) => {
	const { cells } = useNotebookStore.getState();
	return formatCellsAsMessages(cells, n, limitChars, startIndex, asExchanges);
};

export const getLastNMessageExchanges = (
	n: number,
	limitChars = false,
	startIndex?: number,
) => {
	const { cells } = useNotebookStore.getState();
	return formatCellsAsMessages(cells, n, limitChars, startIndex, true);
};
