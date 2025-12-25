import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { captureException } from "@sentry/nextjs";
import { CoreTool, StreamingTextResponse, streamText } from "ai";
import { z } from "zod";
import { createTraceAndGeneration } from "../utils/langfuse";
import { formatMessages } from "../utils/message";
import {
	ModelInformation,
	getAPIKeyForRequest,
	getBaseURLForRequest,
	getModelForRequest,
} from "../utils/model";
import { ActionState } from "../utils/types/messages";

// Type helper for function tools (not provider-defined tools)
type FunctionTool = CoreTool<any, any> & {
	type?: undefined | "function";
	description?: string;
};

// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV !== "production";

// Action Types
export enum ActionType {
	Code = "code",
	Markdown = "markdown",
	FixError = "fixError",
	Download = "download",
	Summary = "summary",
	Stop = "stop",
}

// Define the cell interface
interface Cell {
	source: string;
}

// Action Function Definition
export const ACTION_FUNCTION: CoreTool = {
	description:
		"The function to call after deciding what action to take in the conversation.",
	parameters: z.object({
		action: z.discriminatedUnion("type", [
			z.object({
				type: z.literal(ActionType.Code),
				cells: z.array(z.object({ source: z.string() })),
				reason: isDevelopment ? z.string() : z.string().optional(),
			}),
			z.object({
				type: z.literal(ActionType.Markdown),
				cells: z.array(z.object({ source: z.string() })),
				reason: isDevelopment ? z.string() : z.string().optional(),
			}),
			z.object({
				type: z.literal(ActionType.FixError),
				cells: z.array(z.object({ source: z.string() })),
				reason: isDevelopment ? z.string() : z.string().optional(),
			}),
			z.object({
				type: z.literal(ActionType.Download),
				filesOrVariablesToDownload: z.array(z.string()),
				cells: z.array(z.object({ source: z.string() })),
				reason: isDevelopment ? z.string() : z.string().optional(),
			}),
			z.object({
				type: z.literal(ActionType.Summary),
				cells: z.array(z.object({ source: z.string() })),
				reason: isDevelopment ? z.string() : z.string().optional(),
			}),
			z.object({
				type: z.literal(ActionType.Stop),
				reason: isDevelopment ? z.string() : z.string().optional(),
			}),
		]),
	}),
};

const filterActionByType = (
	actionFunction: FunctionTool,
	actionType: ActionType,
): FunctionTool => {
	const clonedFunction: FunctionTool = {
		description: actionFunction.description,
		parameters: cloneZodSchema(actionFunction.parameters),
	};
	const parameters = clonedFunction.parameters as z.ZodObject<any>;
	const actionSchema = parameters.shape.action as z.ZodDiscriminatedUnion<
		"type",
		[z.ZodObject<any>, z.ZodObject<any>, z.ZodObject<any>]
	>;

	// Create a new discriminated union with filtered options
	const filteredOptions = actionSchema.options.filter(
		(obj: z.ZodObject<any>) => obj.shape.type.value !== actionType,
	);

	// Replace the action schema with the new filtered discriminated union
	parameters.shape.action = z.discriminatedUnion(
		"type",
		filteredOptions as any,
	);

	return clonedFunction;
};

function cloneZodSchema(schema: z.ZodTypeAny): z.ZodTypeAny {
	if (schema instanceof z.ZodObject) {
		const newShape: { [k: string]: z.ZodTypeAny } = {};
		for (const [key, value] of Object.entries(schema.shape)) {
			newShape[key] = cloneZodSchema(value as z.ZodTypeAny);
		}
		return z.object(newShape).describe(schema.description || "");
	} else if (schema instanceof z.ZodEnum) {
		return z.enum(schema.options).describe(schema.description || "");
	} else if (schema instanceof z.ZodLiteral) {
		return z.literal(schema.value).describe(schema.description || "");
	} else if (schema instanceof z.ZodUnion) {
		return z
			.union(
				schema.options.map((option: z.ZodTypeAny) =>
					cloneZodSchema(option),
				),
			)
			.describe(schema.description || "");
	} else if (schema instanceof z.ZodDiscriminatedUnion) {
		const options = schema.options.map((option: z.ZodTypeAny) =>
			cloneZodSchema(option),
		);
		return z
			.discriminatedUnion(schema.discriminator, options as any)
			.describe(schema.description || "");
	}

	// For other types, we'll return a new instance of the same type
	return schema.constructor();
}

const maskActions = (actionState: ActionState): FunctionTool => {
	// Replace cloneDeep with deepClone
	const clonedActionFunction: FunctionTool = {
		description: ACTION_FUNCTION.description,
		parameters: cloneZodSchema(ACTION_FUNCTION.parameters),
	};
	const maskedActionFunction = clonedActionFunction;

	if (actionState.firstQuery) {
		filterActionByType(maskedActionFunction, ActionType.Stop);
	}
	const lastMessage =
		actionState.messagesAfterQuery &&
		actionState.messagesAfterQuery.length != 0
			? actionState.messagesAfterQuery[
					actionState.messagesAfterQuery.length - 1
			  ]
			: null;

	if (
		actionState.firstQuery ||
		(lastMessage && lastMessage.role != "assistant") ||
		(lastMessage &&
			lastMessage.role == "assistant" &&
			!lastMessage?.content
				.toString()
				.includes(`\"error_occurred\":true`))
	) {
		filterActionByType(maskedActionFunction, ActionType.FixError);
	}

	return maskedActionFunction;
};

const getAvailableActions = (actionFunction: FunctionTool): ActionType[] => {
	const schema = actionFunction.parameters as z.ZodObject<any>;
	const actionSchema = schema.shape.action as z.ZodDiscriminatedUnion<
		"type",
		[z.ZodObject<any>, z.ZodObject<any>, z.ZodObject<any>]
	>;

	return actionSchema.options.map(
		(option) => option.shape.type.value as ActionType,
	);
};

export const processActionRequest = async (
	actionState: ActionState,
	modelInformation?: ModelInformation,
	uniqueId?: string,
	autoExecuteGeneratedCode = false,
): Promise<StreamingTextResponse> => {
	const systemPrompt = `You are a helpful agent that decides which action needs to be taken in the conversation.
- Always continue until the user's question is completely answered.
- Stop the conversation if an agent has asked for more information from the user.
- Ensure that the assistant has provided a clear result summary.
- The user's auto-execute preference is ${autoExecuteGeneratedCode}.`;

	const messages = formatMessages(systemPrompt, actionState, 5e3);
	const maskedActionFunction = maskActions(actionState);

	const modelType = modelInformation?.modelType;
	const model = getModelForRequest(modelInformation);
	const apiKey = getAPIKeyForRequest(modelInformation);
	const baseURL = getBaseURLForRequest(modelInformation);

	let client: any;
	if (modelType === "openai" || modelType === "ollama") {
		const openai = createOpenAI({ apiKey: apiKey, baseURL: baseURL });
		client = openai(model);
	} else if (modelType === "anthropic") {
		const anthropic = createAnthropic({ apiKey: apiKey, baseURL: baseURL });
		client = anthropic(model);
	} else {
		throw new Error("Model type not supported");
	}

	try {
		const { trace, generation } = createTraceAndGeneration(
			"action",
			actionState,
			messages,
			model,
			uniqueId,
		);

		const response = await streamText({
			model: client,
			messages: messages,
			temperature: 0.5,
			system: systemPrompt,
			tools: { NextAction: maskedActionFunction },
			toolChoice: "required",
			onFinish(event) {
				generation.end({
					output: event.text,
				});
				trace.update({
					output: event.text,
				});
			},
		});

		return new StreamingTextResponse(response.textStream);
	} catch (error) {
		console.error(error);
		captureException(error);
		throw new Error("Error calling LLM API");
	}
};
