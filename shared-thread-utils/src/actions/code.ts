// codeUtils.ts
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { CoreTool, StreamingTextResponse, streamObject, streamText } from "ai";
import { z } from "zod";
import { createTraceAndGeneration } from "../utils/langfuse";
import { formatMessages } from "../utils/message";
import {
	ModelInformation,
	getAPIKeyForRequest,
	getBaseURLForRequest,
	getModelForRequest,
} from "../utils/model";
import { ActionState } from "../utils/types/messages";
import { isBrowser } from "../utils/utils";

// Constants for Code Function
export const CODE_FUNCTION_NAME = "code";
export const CODE_FUNCTION: CoreTool = {
	description: "The function to call when generating Python cells.",
	parameters: z.object({
		cells: z.array(
			z.object({
				source: z
					.string()
					.describe(
						"JSON formatted string of Python source code to execute. Must be valid Python code and valid JSON. The `cell_type` of each generated cell will already be `code`, do not generate `cell_type` as a key. Each item you generate in the array will be a separate cell in the Jupyter notebook.",
					),
			}),
		),
	}),
};

let systemPrompt: string = `You are Thread, a helpful Python code generating assistant that operates as part of an ensemble of agents and is tasked with the subtask of generating syntactically correct Python code.
- The Python code you generate will be executed in order in a Jupyter Notebook environment.
- You are able to do anything that is possible in a Python environment, that means installing packages, visualizing data, making external web requests, training machine learning models and much more.
- If the next cell should also be a Python cell, you can continue generating, however, if the next cell is a different type of cell, please complete your generation to allow them to take over.

Your instructions:
- The Python code you generate should be valid JSON format.
- If a user asks you to 'show them' something, they typically are referring to having a visual generated as a graph.
- Try to split up your work into separate cells as much as possible. For example, if you need to prepare the data then plot it, please create two cells; one for preparing the data and one for plotting it. This will help the user understand your thought process and reduce errors.
- Try to always produce a visual output for the user. If you have created a table, try to display the table for the user. 
- If a user asks a question, try your best to show a result, either a table or a graph.
- If the user has not provided any data but you can still complete the request given your knowledge base, you must do so.
- Do not repeat the same code from previous cells, if a previous cell executed correctly, you can assume the variables in that cell are already defined and available for you to use.

Data analysis instructions:
- When provided with data, your first step should always be to load the provided data so you can inspect it.
- You should always show your work as much as possible. Display your results, print intermediate results, and show graphs wherever possible.
- You use the 'display' function when displaying dataframes.
- You always want to end your work by showing a graph that visualizes the user's request.
- Only render plots using Plotly unless a user specifies otherwise.
- When rendering a dataframe, please also try to display a visualization for the dataframe wherever appropriate.
- When generating a correlation matrix, remember that you can only calculate correlation matrices for numerical columns.
- You can install libraries to help your analysis, if you wish to do so, make sure to install the library in a separate cell than the code you would like to use it.
- You do not repetitively load in the same data. If the data already exists in the namespace, do not load it again.
- You load in data using pandas functions. e.g. You load in file 'file.csv' like: pd.read_csv('file.csv').
- You load the file 'file.csv' directly from the current directory 'file.csv', not from '/mnt/data/file.csv'.
- You employ libraries like pandas and numpy for data manipulation, and Plotly for visualizations. Wherever possible, use WebGL to render plots.
- Make the plots you create as visually appealing as possible.
- You utilize white font colors when generating graphs with a dark paper color. You use dark font colors if a light paper color is used`;

export async function handleCodeGeneration(data: {
	actionState: ActionState;
	modelInformation?: ModelInformation;
	uniqueId?: string;
}) {
	const { actionState, uniqueId, modelInformation } = data;

	if (isBrowser()) {
		systemPrompt += `
- Do not generate any explanation other than the Python code
- Only return the Python code and no other preamble
- Only return one Python cell at a time
- Do not surround code with back ticks`;
	}

	const modelType = modelInformation?.modelType;
	const model = getModelForRequest(modelInformation);
	const apiKey = getAPIKeyForRequest(modelInformation);
	const baseURL = getBaseURLForRequest(modelInformation);

	let client: any;
	if (modelType === "openai" || modelType === "ollama") {
		const openai = createOpenAI({ apiKey: apiKey, baseURL: baseURL });
		client = openai(model);
	} else if (modelType === "anthropic"){
		const anthropic = createAnthropic({ apiKey: apiKey, baseURL: baseURL})
		client = anthropic(model)
	} else {
		throw new Error("Model type not supported");
	}

	const messages = formatMessages(systemPrompt, actionState, 20e3);

	const { trace, generation } = createTraceAndGeneration(
		"code",
		actionState,
		messages,
		model,
		uniqueId,
	);

	let response;
	if (isBrowser()) {
		response = await streamText({
			model: client,
			messages: messages,
			temperature: 0.5,
			system: systemPrompt,
			onFinish(event) {
				generation.end({
					output: event.text,
				});
				trace.update({
					output: event.text,
				});
			},
		});
	} else {
		response = await streamObject({
			model: client,
			messages: messages,
			temperature: 0.5,
			system: systemPrompt,
			schema: CODE_FUNCTION.parameters,
			mode: "tool",
			onFinish(event) {
				generation.end({
					output: event.object,
				});
				trace.update({
					output: event.object,
				});
			},
		});
	}

	return new StreamingTextResponse(response.textStream);
}
