import { captureException } from "@sentry/nextjs";
import { NextApiResponse } from "next";
import { NextResponse } from "next/server";
import {
	ActionState,
	ModelInformation,
	handleCodeGeneration,
} from "shared-vizly-notebook-utils";

/* This is required to use OpenAIStream. */
export const runtime = "edge";

export default async function handler(req: Request, res: NextApiResponse) {
	if (req.method === "POST") {
		const { actionState, uniqueId, modelInformation } =
			(await req.json()) as {
				actionState: ActionState;
				modelInformation?: ModelInformation;
				uniqueId?: string;
			};
		if (!uniqueId) {
			NextResponse.json({ status: 401 });
			return;
		}

		try {
			return await handleCodeGeneration({
				actionState,
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
		return NextResponse.json({ status: 200 });
	} else {
		// Handle any non-POST requests
		return NextResponse.json(
			{ error: "Error calling OpenAI API" },
			{ status: 405 },
		);
	}
}
