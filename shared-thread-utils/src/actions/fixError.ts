import { StreamingTextResponse } from "ai";
import { FunctionDefinition } from "openai/resources";
import {
	captureOpenAIStream,
	createTraceAndGeneration,
} from "../utils/langfuse";
import { formatMessages } from "../utils/message";
import { ModelInformation, getModelForRequest } from "../utils/model";
import { getOpenAIClient, isBrowser } from "../utils/openai";
import { ActionState } from "../utils/types/messages";

// Constants for Fix Function
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

let systemPrompt: string = `You are Thread, a helpful Python code fixing assistant that operates as part of an ensemble of agents and is tasked with the subtask of fixing Python code that encountered syntax, runtime or other errors.
- The Python code you generate will be executed in the same Jupyter Notebook environment where the other error occurred.
Your instructions:
- The Python code you generate should be valid JSON format.
- The code you generate should try to solve the error as accurately as possible while trying to still respect the original intention of what the code was trying to do.
- You should only produce the JSON formatted string for the Python code.`;

if (isBrowser()) {
	systemPrompt += `
- Do not generate any explanation other than the Python code
- Only return the Python code and no other preamble
- Only return one Python cell at a time
- Do not surround code with back ticks`;
}

// Function to handle error fixing
export async function handleFixError(data: {
	actionState: ActionState;
	uniqueId?: string;
	modelInformation?: ModelInformation;
}) {
	const { actionState, uniqueId, modelInformation } = data;

	const openai = getOpenAIClient(modelInformation);
	const model = getModelForRequest(modelInformation);
	const messages = formatMessages(systemPrompt, actionState, 20e3);

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
		...(isBrowser()
			? {}
			: {
					tools: [{ type: "function", function: FIX_FUNCTION }],
					tool_choice: {
						type: "function",
						function: { name: FIX_FUNCTION_NAME },
					},
			  }),
		stream: true,
	});

	const stream = captureOpenAIStream(response, trace, generation);
	return new StreamingTextResponse(stream);
}
