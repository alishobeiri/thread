import { ToolCall } from "ai";
import { parse } from "best-effort-json-parser";
import { useCallback, useEffect, useState } from "react";
import { useSettingsStore } from "../components/modals/server-settings/SettingsStore";
import { threadFetch } from "./utils";

const { getAdditionalRequestMetadata } = useSettingsStore.getState();

interface MakeStreamingRequestParams {
	url: string;
	method: "GET" | "POST" | "PUT" | "DELETE";
	payload?: any;
	abortController?: AbortController | undefined;
	shouldCancel?: () => boolean;
}

interface JsonStreamingParams extends MakeStreamingRequestParams {
	manual?: boolean;
}

interface RunManuallyParams {
	payload: any;
}

export async function* makeStreamingRequest({
	url,
	method,
	payload,
	shouldCancel = () => false,
}: MakeStreamingRequestParams) {
	try {
		const res = await threadFetch(url, {
			method: method,
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				...payload,
				...getAdditionalRequestMetadata(),
			}),
		});

		const data = res.body;

		if (data && res.status == 200) {
			const reader = data.getReader();
			const decoder = new TextDecoder();
			let done = false;

			let buffer = "";

			while (!done) {
				if (shouldCancel()) {
					reader.cancel();
					break;
				}
				const { value, done: doneReading } = await reader.read();
				done = doneReading;
				const chunkValue = decoder.decode(value);

				buffer += chunkValue;

				yield buffer;
			}
		}
	} catch (error: unknown) {
		if (error instanceof Error) {
			if (error.name === "AbortError") {
				throw Error("Fetch aborted");
			} else {
				console.error("Fetch error:", error.message);
				throw Error("Error fetching: " + error.message);
			}
		} else {
			console.error("An unexpected error occurred:", error);
		}
	}
}

export async function* makeStreamingFunctionRequest<T>({
	url,
	method,
	payload,
	shouldCancel = () => false,
}: MakeStreamingRequestParams) {
	const stream = makeStreamingJsonRequest({
		url,
		method,
		payload,
		shouldCancel: () => shouldCancel(),
	});

	for await (const data of stream) {
		if (
			!(
				"tool_calls" in data &&
				data["tool_calls"] != undefined &&
				Array.isArray(data["tool_calls"]) &&
				data["tool_calls"].length > 0
			)
		) {
			continue;
		}

		const toolCalls: ToolCall[] = data["tool_calls"];
		const functionCall = toolCalls[0].function;
		const rawArgs = functionCall.arguments;

		if (!rawArgs || rawArgs.length == 0) {
			continue;
		}

		let args;
		try {
			args = parse(rawArgs);
		} catch (e) {
			continue;
		}
		yield args;
	}
}

async function* makeStreamingJsonRequest<T>({
	url,
	method,
	payload,
	shouldCancel = () => false,
}: MakeStreamingRequestParams) {
	let cancel = false;
	const stream = makeStreamingRequest({
		url,
		method,
		payload,
		shouldCancel: () => cancel || shouldCancel(),
	});

	let errorCount = 0;
	for await (const chunk of stream) {
		if (chunk) {
			try {
				const parsedChunk = parse(chunk);
				if (
					parsedChunk &&
					typeof parsedChunk === "object" &&
					parsedChunk.constructor === Object
				) {
					yield parsedChunk;
				} else {
					throw Error(
						"Parsed Chunk was not an object: " + typeof parsedChunk,
					);
				}
			} catch (e) {
				console.error("Error parsing JSON: ", e);
				errorCount += 1;
				if (errorCount >= 3) {
					cancel = true;
					break;
				}
			}
		}
	}
}

const useJsonStreaming = <T>({
	url,
	method,
	payload,
	manual,
}: JsonStreamingParams) => {
	const [data, setData] = useState<T | null>(null);

	const runAutomatically = useCallback(async () => {
		const stream = makeStreamingRequest({ url, method, payload });

		for await (const chunk of stream) {
			setData(parse(chunk));
		}
	}, [url, payload]);

	const run = async (params?: RunManuallyParams) => {
		const stream = makeStreamingJsonRequest<T>({
			url,
			method,
			payload: params?.payload || payload,
		});

		for await (const chunk of stream) {
			setData(chunk);
		}
	};

	useEffect(() => {
		if (!manual) {
			runAutomatically();
		}
	}, [url, payload, manual, runAutomatically]);

	return { data, run };
};

export { makeStreamingJsonRequest, useJsonStreaming };
