import { captureException } from "@sentry/nextjs";
import { NextApiResponse } from "next";
import { NextResponse } from "next/server";
import { ChatCompletionMessageParam } from "openai/resources";
import { ModelInformation, handleChatRequest } from "shared-thread-utils";

/* This is required to use OpenAIStream. */
export const runtime = "edge";

export default async function handler(req: Request, res: NextApiResponse) {
	if (req.method === "POST") {
		const { messages, modelInformation, uniqueId } = (await req.json()) as {
			messages: ChatCompletionMessageParam[];
			modelInformation: ModelInformation;
			uniqueId?: string;
		};
		if (!uniqueId) {
			NextResponse.json({ status: 401 });
			return;
		}

		try {
			return handleChatRequest({
				messages,
				modelInformation,
				uniqueId,
			});
		} catch (error) {
			captureException(error);
			console.error("Error calling OpenAI API:", error);
			return NextResponse.json(
				{ error: "Error calling OpenAI API" },
				{ status: 500 },
			);
		}
	} else if (req.method === "OPTIONS") {
		return NextResponse.json(
			{ error: "Error calling OpenAI API" },
			{ status: 200 },
		);
	} else {
		// Handle any non-POST requests
		return NextResponse.json(
			{ error: "Error calling OpenAI API" },
			{ status: 405 },
		);
	}
}
