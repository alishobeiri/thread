import { captureException } from "@sentry/nextjs";
import { StreamingTextResponse } from "ai";
import { NextApiResponse } from "next";
import { NextResponse } from "next/server";
import { FunctionDefinition } from "openai/resources";
import { ActionState, NoterousMessage } from "../../../../types/messages";
import {
	captureOpenAIStream,
	createTraceAndGeneration,
} from "../../_shared/langfuse";
import { formatMessages } from "../../_shared/message";
import { ModelInformation, getModelForRequest } from "../../_shared/model";
import { getOpenAIClient } from "../../_shared/openai";

export const CODE_FUNCTION_NAME = "code";
export const CODE_FUNCTION: FunctionDefinition = {
	name: CODE_FUNCTION_NAME,
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

/* This is required to use OpenAIStream. */
export const runtime = "edge";

export default async function handler(req: Request, res: NextApiResponse) {
	if (req.method === "POST") {
		const { actionState, uniqueId, modelInformation } =
			(await req.json()) as {
				actionState: ActionState;
				uniqueId?: string;
				modelInformation?: ModelInformation;
			};

		const systemPrompt = `You are Thread, a helpful Python code fixing assistant that operates as part of an ensemble of agents and is tasked with the subtask of fixing Python code that encountered syntax, runtime or other errors.
- The Python code you generate will be executed in the same Jupyter Notebook environment where the other error occurred. 

Your instructions:
- The Python code you generate should be valid JSON format.
- The code you generate should try to solve the error as accurately as possible while trying to still respect the original intention of what the code was trying to do.
- You should only produce the JSON formatted string for the Python code.`;

		const messages = [
			...formatMessages(systemPrompt, actionState, 20e3),
			{
				role: "user",
				content: "Fix the error encountered above",
			} as NoterousMessage,
		];

		try {
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
				tools: [{ type: "function", function: CODE_FUNCTION }],
				tool_choice: {
					type: "function",
					function: { name: CODE_FUNCTION_NAME },
				},
				stream: true,
			});

			const stream = captureOpenAIStream(response, trace, generation);
			return new StreamingTextResponse(stream);
		} catch (error) {
			captureException(error);
			console.error("Error calling OpenAI API:", error);
			return NextResponse.json(
				{ error: "Error calling OpenAI API" },
				{ status: 500 },
			);
		}
	} else if (req.method === "OPTIONS") {
		return NextResponse.json({ status: 200 });
	} else {
		// Handle any non-POST requests
		return NextResponse.json(
			{ error: "Error calling OpenAI API" },
			{ status: 405 },
		);
	}
}
