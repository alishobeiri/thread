import { captureException } from "@sentry/nextjs";
import { NextApiResponse } from "next";
import { NextResponse } from "next/server";
import { handleCellEdit, ModelInformation } from "shared-thread-utils";

/* This is required to use OpenAIStream. */
export const runtime = "edge";

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

		try {
			return await handleCellEdit({
				userRequest,
				currentCellSource,
				currentNamespace,
				theme,
				uniqueId,
				modelInformation,
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
