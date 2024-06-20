import { captureException } from "@sentry/nextjs";
import { NextApiResponse } from "next";
import { NextResponse } from "next/server";
import { ModelInformation } from "shared-thread-utils";
import { ActionState } from "../../../../types/messages";

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
		if (!uniqueId) {
			NextResponse.json({ status: 401 });
			return;
		}

		try {
			// return await handleFixError({
			// 	actionState,
			// 	uniqueId,
			// 	modelInformation,
			// });
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
