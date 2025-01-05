import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";

import { captureException } from "@sentry/nextjs";
import { NextApiRequest, NextApiResponse } from "next";
import { Database } from "../../../types/database.types";

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	if (req.method === "POST") {
		const userToken = req.body.userToken;
		const jupyterHubUrl = process.env.JUPYTER_HUB_URL!;
		const token = process.env.JUPYTER_HUB_API_TOKEN!;

		const supabaseClient = createPagesServerClient<Database>({ req, res });

		const user = await supabaseClient.auth.getUser();

		if (!user) {
			res.status(401).json({ message: "Unauthorized" });
			return;
		}
		const userId = user.data.user?.id!;
		try {
			const userStatus = await checkOrCreateUser(
				userId,
				jupyterHubUrl,
				token,
			);
			const serverResponse = await startServerForUser(
				userId,
				jupyterHubUrl,
				token,
			);
			const tokenData = await manageUserToken(
				userId,
				jupyterHubUrl,
				token,
				userToken,
			);

			res.status(200).json({
				serverUrl: jupyterHubUrl,
				token: tokenData,
			});
		} catch (error) {
			captureException(error);
			console.error(error);
			res.status(500).json({ message: error });
		}
	} else {
		res.setHeader("Allow", ["POST"]);
		res.status(405).end(`Method ${req.method} Not Allowed`);
	}
}

async function checkOrCreateUser(
	userId: string,
	jupyterHubUrl: string,
	token: string,
) {
	const userCheckResponse = await fetch(
		`${jupyterHubUrl}/hub/api/users/${userId}`,
		{
			headers: {
				Authorization: `token ${token}`,
			},
		},
	);

	if (userCheckResponse.ok) {
		return "User already exists";
	} else if (userCheckResponse.status === 404) {
		const userResponse = await fetch(
			`${jupyterHubUrl}/hub/api/users/${userId}`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `token ${token}`,
				},
			},
		);

		if (!userResponse.ok) {
			throw new Error(`Error creating user: ${userResponse.status}`);
		}

		return "User created";
	} else {
		throw new Error(`Error checking user: ${userCheckResponse.status}`);
	}
}

async function startServerForUser(
	userId: string,
	jupyterHubUrl: string,
	token: string,
) {
	const startResponse = await fetch(
		`${jupyterHubUrl}/hub/api/users/${userId}/server`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `token ${token}`,
			},
			body: JSON.stringify({
				cmd: "jupyterhub-singleuser",
				args: [
					"--ip=0.0.0.0",
					'--ServerApp.allow_origin_pat="^(http?://localhost:3000|https?://.*.noterous.com|https?://noterous.onrender.com|https?://(.*.)?vizly.fyi|https?://(.*.)?vizlylabs.com)$"',
					"--ServerApp.allow_credentials=True",
					// Shut down the server after  hour of no kernels to save resources
					"--ServerApp.shutdown_no_activity_timeout=1800",
					// Cull idle kernels after 30 minutes
					"--MappingKernelManager.cull_idle_timeout=1800",
					// Check every 5 minutes to see if kernels need to be culled
					"--MappingKernelManager.cull_interval=300",
					// Cull kernels that may still be connected (tab open) but have been idle for the last 30 minutes
					"--MappingKernelManager.cull_connected=True",
					"--ContentsManager.allow_hidden=True",
				],
				environment: {},
				image: "847937350019.dkr.ecr.us-west-2.amazonaws.com/jupyter-server-singleuser:1.0.65",
			}),
		},
	);

	try {
		const response = await startResponse.json();
		if (
			response["status"] == "400" &&
			response["message"].includes("is already running")
		) {
			// This is a non-error state
			return startResponse;
		}
	} catch {}

	if (!startResponse.ok) {
		console.error(startResponse);
		throw new Error(`Error starting server: ${startResponse.status}`);
	}

	return startResponse;
}

async function manageUserToken(
	userId: string,
	jupyterHubUrl: string,
	token: string,
	userToken?: string,
) {
	if (userToken && userToken != "undefined") {
		return userToken;
	} else {
		const tokenResponse = await fetch(
			`${jupyterHubUrl}/hub/api/users/${userId}/tokens`,
			{
				method: "POST",
				headers: {
					Authorization: `token ${token}`,
					"Content-Type": "application/json",
				},
			},
		);

		if (!tokenResponse.ok) {
			throw new Error(`Error creating token: ${tokenResponse.status}`);
		}

		const newTokenData = await tokenResponse.json();
		return newTokenData["token"];
	}
}
