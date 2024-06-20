import { captureException } from "@sentry/nextjs";
import { NextApiResponse } from "next";
import { NextResponse } from "next/server";
import { getMessagesPayload, handleChatRequest } from "shared-thread-utils";
import { ChatMessage } from "../../../types/messages";
import { ModelInformation } from "../_shared/model";

/* This is required to use OpenAIStream. */
export const runtime = "edge";

export default async function handler(req: Request, res: NextApiResponse) {
	if (req.method === "POST") {
		const {
			query,
			previousMessages,
			currentChatContext,
			currentChatNamespace,
			activeCellSource,
			modelInformation,
			mostRelevantContextualCellsForQuery,
			uniqueId,
		} = (await req.json()) as {
			query: string;
			previousMessages: ChatMessage[];
			currentChatContext: string[];
			currentChatNamespace: string;
			activeCellSource: string;
			mostRelevantContextualCellsForQuery: string[];
			modelInformation?: ModelInformation;
			uniqueId?: string;
		};

		if (!query) {
			console.error("No message found in the request body");
			return res.status(400).json({ error: "No message provided" });
		}

		const messages = getMessagesPayload({
			previousMessages,
			currentChatContext,
			currentChatNamespace,
			query,
			activeCellSource,
			mostRelevantContextualCellsForQuery,
		});

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
