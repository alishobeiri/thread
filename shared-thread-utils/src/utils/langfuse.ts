import { captureException } from "@sentry/nextjs";
import { StreamTextResult } from "ai";
import { parse } from "best-effort-json-parser";
import {
	Langfuse,
	LangfuseGenerationClient,
	LangfuseTraceClient,
} from "langfuse";
import { ActionState } from "./types/messages";

export class LangfuseClient {
	private static instance: Langfuse;
	private constructor() {
		LangfuseClient.instance = new Langfuse({
			secretKey: process.env.LANGFUSE_SECRET_KEY,
			publicKey: process.env.LANGFUSE_PUBLIC_KEY,
			baseUrl: process.env.LANGFUSE_HOST,
		});
	}

	public static getInstance(): Langfuse {
		if (!LangfuseClient.instance) {
			new LangfuseClient();
		}

		return LangfuseClient.instance;
	}
}

export const captureAIStream = (
	response: StreamTextResult<any>,
	trace: LangfuseTraceClient,
	generation: LangfuseGenerationClient,
) => {
	return response.toAIStream({
		onStart: () => {
			generation.update({
				completionStartTime: new Date(),
			});
		},
		onCompletion: async (completion) => {
			let output = completion;
			try {
				output = parse(completion)["tool_calls"];
			} catch (e) {
				captureException(e);
				console.error("Error parsing completion", e);
			}

			const outputIsArray = Array.isArray(output);
			let outputRepeated = false;
			if (outputIsArray && output.length > 1) {
				for (let i = 0; i < output.length - 1; i++) {
					if (output[i] === output[i + 1]) {
						outputRepeated = true;
						break;
					}
				}
			}

			generation.end({
				output: output,
				level: outputRepeated ? "WARNING" : "DEFAULT",
				statusMessage: outputRepeated
					? "Output was repeated"
					: undefined,
			});
			trace.update({
				output: completion,
			});

			await LangfuseClient.getInstance().shutdownAsync();
		},
	});
};

export const createTraceAndGeneration = (
	traceLabel: string,
	actionState: ActionState,
	messages: any[],
	model: string,
	uniqueId?: string,
) => {
	const trace = LangfuseClient.getInstance().trace({
		id: actionState.group,
		name: `${traceLabel}`,
		input: actionState,
		userId: uniqueId,
	});
	const generation = trace.generation({
		name: `${traceLabel}`,
		input: messages,
		model: model,
	});

	return { trace, generation };
};
