import { captureException } from "@sentry/nextjs";
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";
import { NextApiRequest, NextApiResponse } from "next";
import { Database } from "../../../types/database.types";

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	if (req.method === "GET") {
		try {
			const supabase = createPagesServerClient<Database>({ req, res });

			const { data, error } = await supabase.auth.getSession();
			const session = data.session;

			if (!session?.user) {
				res.status(401).json({ message: "Unauthorized" });
				return;
			}
			const jupyterHubUrl = process.env.JUPYTER_HUB_URL!;
			const token = process.env.JUPYTER_HUB_API_TOKEN!;
			const userId = session.user.id;

			const serverResponse = await fetch(
				`${jupyterHubUrl}/hub/api/users/${userId}`,
				{
					method: "GET",
					headers: {
						"Content-Type": "application/json",
						Authorization: `token ${token}`,
					},
				},
			);
			const serverData = await serverResponse.json();
			res.status(200).json({
				server:
					"server" in serverData && serverData["server"]
						? Object.keys(serverData["server"]).length > 0
						: false,
			});
		} catch (error) {
			console.error(error);
			captureException(error);
			res.status(500).json({ message: error });
		}
	} else {
		res.setHeader("Allow", ["POST"]);
		res.status(405).end(`Method ${req.method} Not Allowed`);
	}
}
