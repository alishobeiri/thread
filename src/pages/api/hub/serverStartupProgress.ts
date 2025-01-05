import { captureException } from "@sentry/nextjs";
import { NextApiRequest, NextApiResponse } from "next";
import fetch from "node-fetch";

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	if (req.method === "GET") {
		const { user } = req.query;

		const jupyterHubUrl = process.env.JUPYTER_HUB_URL;
		const token = process.env.JUPYTER_HUB_API_TOKEN;

		// Construct the URL to the JupyterHub progress API
		const jupyterHubProgressUrl = `${jupyterHubUrl}/hub/api/users/${user}/server/progress`;

		// Set headers for SSE
		res.setHeader("Content-Type", "text/event-stream");
		res.setHeader("Cache-Control", "no-cache");
		res.setHeader("Connection", "keep-alive");

		// Required to prevent NextJS from queuing all the events to send at once
		res.setHeader("Content-Encoding", "none");
		res.flushHeaders(); // Flush the headers to establish SSE with client

		try {
			// Fetch the progress from JupyterHub's progress API
			const jupyterResponse = await fetch(jupyterHubProgressUrl, {
				headers: {
					Authorization: `token ${token}`,
					"Content-Type": "application/json",
				},
			});

			if (!jupyterResponse || !jupyterResponse.body) {
				res.end();
				return;
			}

			// Node.js streams are event-driven. Here we forward chunks of data as they come.
			jupyterResponse.body.on("data", (chunk) => {
				// Now you can log or process the string
				res.write(chunk);
			});

			// When the stream ends, we end the response.
			jupyterResponse!.body.on("end", () => {
				res.end();
			});

			// If there's an error, we'll log it and end the response.
			jupyterResponse.body.on("error", (err) => {
				console.error("Stream encountered an error:", err);
				res.end();
			});
		} catch (error) {
			captureException(error);
			console.error("Error fetching JupyterHub progress:", error);
			res.status(500).json({ message: "Error fetching progress" });
		}
	} else {
		// Handle any non-GET requests
		res.setHeader("Allow", ["GET"]);
		res.status(405).end(`Method ${req.method} Not Allowed`);
	}
}
