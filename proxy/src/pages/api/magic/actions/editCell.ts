import { captureException } from "@sentry/nextjs";
import { StreamingTextResponse } from "ai";
import { NextApiResponse } from "next";
import { NextResponse } from "next/server";
import {
	ChatCompletionMessageParam,
	FunctionDefinition,
} from "openai/resources";
import { v4 as uuidv4 } from "uuid";
import { LangfuseClient, captureOpenAIStream } from "../../_shared/langfuse";
import { ModelInformation, getModelForRequest } from "../../_shared/model";
import { getOpenAIClient } from "../../_shared/openai";
import { getThemePrompt } from "../../_shared/promptUtils";

/* This is required to use OpenAIStream. */
export const runtime = "edge";

export const CELL_EDIT_FUNCTION_NAME = "editCode";
export const CELL_EDIT_FUNCTION: FunctionDefinition = {
	name: CELL_EDIT_FUNCTION_NAME,
	description:
		"The function to call after generating the edits required by the user.",
	parameters: {
		type: "object",
		properties: {
			source: {
				type: "string",
				description:
					"JSON formatted string of the cell source. Should be Python code, should never be undefined.",
			},
		},
		required: ["source"],
	},
};

export default async function handler(req: Request, res: NextApiResponse) {
	if (req.method === "POST") {
		const {
			userRequest,
			currentCellSource,
			currentNamespace,
			theme,
			uniqueId,
			modelInformation,
		} = (await req.json()) as {
			userRequest?: string;
			currentCellSource?: string;
			currentNamespace?: string;
			theme: "dark" | "light";
			uniqueId?: string;
			modelInformation?: ModelInformation;
		};

		const context = {
			userRequest: userRequest,
			currentCellSource: currentCellSource,
			currentNamespace: currentNamespace,
		};

		const themePrompt = getThemePrompt(theme);

		const messages: ChatCompletionMessageParam[] = [
			{
				role: "system",
				content: `You are an expert Python assistant that can edit Python code in order to make sure it's output or intended function more closely match the request of the user. 

You will be given:
- A user request
- Current Python code that the user wants to edit
- List of files the user has uploaded
- Current Python namespace

General working principles:
- Generate syntatically correct Python code
- Wherever possible, use the existing Python code as much as possible, only making small edits where necessary
- Do not make assumptions about variables or functions unless the assumption is supported by the variables in the namespace
- When displaying dataframes, use the 'display' function instead of print

${themePrompt}`,
			},
			{
				role: "user",
				content: JSON.stringify(context),
			},
		];

		const openai = getOpenAIClient(modelInformation);
		const model = getModelForRequest(modelInformation);

		try {
			const model = getModelForRequest(modelInformation);
			const trace = LangfuseClient.getInstance().trace({
				id: uuidv4(),
				name: `editCell`,
				input: messages,
				userId: uniqueId,
			});
			const generation = trace.generation({
				name: `editCell`,
				input: messages,
				model: model,
			});

			const response = await openai.chat.completions.create({
				model: model,
				messages: messages,
				temperature: 0.3,
				tools: [{ type: "function", function: CELL_EDIT_FUNCTION }],
				tool_choice: {
					type: "function",
					function: { name: CELL_EDIT_FUNCTION_NAME },
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
