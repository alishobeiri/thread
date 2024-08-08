import { NextApiRequest, NextApiResponse } from "next";
import {
	ModelInformation,
	processActionRequest,
} from "shared-vizly-notebook-utils";
import { ActionState } from "../../../../types/messages";

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	if (req.method === "POST") {
		const {
			actionState,
			modelInformation,
			uniqueId,
			autoExecuteGeneratedCode,
		}: {
			actionState: ActionState;
			modelInformation?: ModelInformation;
			uniqueId?: string;
			autoExecuteGeneratedCode?: boolean;
		} = req.body;
		if (!uniqueId) {
			res.status(401).json({});
			return;
		}

		try {
			const action = await processActionRequest(
				actionState,
				modelInformation,
				uniqueId,
				autoExecuteGeneratedCode,
			);
			res.status(200).json(action);
		} catch (error) {
			console.error("Error processing action request:", error);
			res.status(500).json({
				message: "Error processing action request",
			});
		}
	} else if (req.method === "OPTIONS") {
		res.status(200).json({ status: 200 });
	} else {
		res.setHeader("Allow", ["POST"]);
		res.status(405).end(`Method ${req.method} Not Allowed`);
	}
}
