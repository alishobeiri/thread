import { StreamingTextResponse } from "ai";
import { FunctionDefinition } from "openai/resources";
import {
	captureOpenAIStream,
	createTraceAndGeneration,
} from "../utils/langfuse";
import { formatMessages } from "../utils/message";
import { ModelInformation, getModelForRequest } from "../utils/model";
import { getOpenAIClient } from "../utils/openai";
import { ActionState, NoterousMessage } from "../utils/types/messages";

// Constants for Code Function
export const FIX_FUNCTION_NAME = "code";
export const FIX_FUNCTION: FunctionDefinition = {
	name: FIX_FUNCTION_NAME,
	description: "The function to call when generating Python cells.",
	parameters: {
		type: "object",
		properties: {
			cells: {
				type: "array",
				items: {
					type: "object",
					properties: {
						source: {
							type: "string",
							description:
								"JSON formatted string of Python source code to execute. Must be valid Python code and valid JSON. The `cell_type` of each generated cell will already be `code`, do not generate `cell_type` as a key. Each item you generate in the array will be a separate cell in the Jupyter notebook.",
						},
					},
				},
			},
		},
		required: ["cells"],
	},
};

const systemPrompt: string = `You are Thread, a helpful Python code fixing assistant that operates as part of an ensemble of agents and is tasked with the subtask of fixing Python code that encountered syntax, runtime or other errors.
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

	const messages = [
		...formatMessages(systemPrompt, actionState, 20e3),
		{
			role: "user",
			content: "Fix the error encountered above",
		} as NoterousMessage,
	];

	const openai = getOpenAIClient(modelInformation);
	const model = getModelForRequest(modelInformation);

	const { trace, generation } = createTraceAndGeneration(
		"fixError",
		actionState,
		messages,
		model,
		uniqueId,
	);

	const response = await openai.chat.completions.create({
		model: model,
		messages: messages,
		temperature: 0.5,
		tools: [{ type: "function", function: FIX_FUNCTION }],
		tool_choice: {
			type: "function",
			function: { name: FIX_FUNCTION_NAME },
		},
		stream: true,
	});

	const stream = captureOpenAIStream(response, trace, generation);
	return new StreamingTextResponse(stream);
}
