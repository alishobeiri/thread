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

// Constants for Fix Function
export const FIX_FUNCTION_NAME = "code";
export const FIX_FUNCTION: CoreTool = {
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

let systemPrompt: string = `You are Thread, a helpful Python code fixing assistant that operates as part of an ensemble of agents and is tasked with the subtask of fixing Python code that encountered syntax, runtime or other errors.
- The Python code you generate will be executed in the same Jupyter Notebook environment where the other error occurred.
Your instructions:
- The Python code you generate should be valid JSON format.
- The code you generate should try to solve the error as accurately as possible while trying to still respect the original intention of what the code was trying to do.
- You should only produce the JSON formatted string for the Python code.`;

// Function to handle error fixing
export async function handleFixError(data: {
	actionState: ActionState;
	uniqueId?: string;
	modelInformation?: ModelInformation;
}) {
	const { actionState, uniqueId, modelInformation } = data;

	const modelType = modelInformation?.modelType;
	const model = getModelForRequest(modelInformation);
	const apiKey = getAPIKeyForRequest(modelInformation);
	const baseURL = getBaseURLForRequest(modelInformation);

	let client: any;
	if (modelType === "openai" || modelType === "ollama") {
		const openai = createOpenAI({ apiKey: apiKey, baseURL: baseURL });
		client = openai(model);
	} else {
		throw new Error("Model type not supported");
	}
	if (isBrowser()) {
		systemPrompt += `- Do not generate any explanation other than the Python code
- Only return the Python code and no other preamble
- Only return one Python cell at a time
- Do not surround code with back ticks`;
	}

	const messages = formatMessages(systemPrompt, actionState, 20e3);

	const { trace, generation } = createTraceAndGeneration(
		"fixError",
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
			schema: FIX_FUNCTION.parameters,
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
