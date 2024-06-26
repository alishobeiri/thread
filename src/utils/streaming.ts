import { StreamingTextResponse } from "ai";
import { parse } from "best-effort-json-parser";
import { useCallback, useEffect, useState } from "react";
import { useSettingsStore } from "../components/settings/SettingsStore";
import { standaloneToast } from "../theme";
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

export async function* parseStream(
	data: ReadableStream<Uint8Array | string>,
	shouldCancel: () => boolean,
) {
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
		if (value instanceof Uint8Array) {
			const chunkValue = decoder.decode(value);
			buffer += chunkValue;
		} else if (typeof value === "string") {
			buffer += value;
		}
		yield buffer;
	}
}

export interface StreamWrapperParams<P> {
	streamGenerator: (params: P) => Promise<StreamingTextResponse>;
	params: P;
	shouldCancel?: () => boolean;
	onError: (error: string | unknown) => void;
}

export async function* parseStreamWrapper<T, P>({
	streamGenerator,
	params,
	shouldCancel = () => false,
}: StreamWrapperParams<P>) {
	try {
		const stream = await streamGenerator(params);
		for await (const chunk of parseStream(stream.body!, shouldCancel)) {
			yield chunk;
		}
	} catch (error: any) {
		standaloneToast({
			title: "Error occurred:",
			description: error.message,
			status: "error",
			duration: 5000,
			isClosable: true,
			position: "top",
		});
		console.error("Error parsing stream chunk:", error);
	}
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
			yield* parseStream(data, shouldCancel);
		}
	} catch (error: unknown) {
		if (error instanceof Error) {
			if (error.name === "AbortError") {
				throw Error("Fetch aborted");
			} else {
				standaloneToast({
					title: "Error occurred:",
					description: error.message,
					status: "error",
					duration: 5000,
					isClosable: true,
					position: "top",
				});
				console.error("Fetch error:", error.message);
				throw Error("Error fetching: " + error.message);
			}
		} else {
			console.error("An unexpected error occurred:", error);
			standaloneToast({
				title: "Error occurred:",
				description: error as any,
				status: "error",
				duration: 5000,
				isClosable: true,
				position: "top",
			});
		}
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
