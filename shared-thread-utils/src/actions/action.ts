import { captureException } from "@sentry/nextjs";
import { FunctionDefinition } from "openai/resources";
import { createTraceAndGeneration } from "../utils/langfuse";
import { formatMessages } from "../utils/message";
import { ModelInformation, getModelForRequest } from "../utils/model";
import { getOpenAIClient } from "../utils/openai";
import { ActionState } from "../utils/types/messages";

// Action Types
export enum ActionType {
	Code = "code",
	FixError = "fixError",
	Stop = "stop",
}

// Action Function Definition
const ACTION_FUNCTION: FunctionDefinition = {
	name: "NextAction",
	description:
		"The function to call after deciding what action to take in the conversation.",
	parameters: {
		type: "object",
		properties: {
			action: {
				oneOf: [
					{
						type: "object",
						description: `Conditions you should return '${ActionType.Code}': 
                        The user has asked you to complete an action that can be completed using code.`,
						properties: {
							type: {
								type: "string",
								const: ActionType.Code,
							},
						},
						required: ["type"],
					},
					{
						type: "object",
						description: `Conditions you should return '${ActionType.FixError}': 
                        The previous cell execution ran into an error.`,
						properties: {
							type: {
								type: "string",
								const: ActionType.FixError,
							},
						},
						required: ["type"],
					},
					{
						type: "object",
						description: `Conditions you should return '${ActionType.Stop}': 
                        You are waiting for the user's input.`,
						properties: {
							type: {
								type: "string",
								const: ActionType.Stop,
							},
						},
						required: ["type"],
					},
				],
				description: "The action to be performed",
			},
		},
		required: ["action"],
	},
};

const filterActionByType = (
	actionFunction: FunctionDefinition,
	actionType: string,
): FunctionDefinition => {
	const parameters = actionFunction.parameters as any;
	parameters.properties.action.oneOf =
		parameters.properties.action.oneOf.filter(
			(obj: any) => obj.properties.type.const !== actionType,
		);
	return actionFunction;
};

// Polyfill or fallback for structuredClone if not natively available
const deepClone = (obj: any): any => {
	if (typeof structuredClone === "function") {
		return structuredClone(obj);
	} else {
		// Simple deep clone implementation fallback
		return JSON.parse(JSON.stringify(obj));
	}
};

const maskActions = (actionState: ActionState) => {
	// Replace cloneDeep with deepClone
	const maskedActionFunction = deepClone(ACTION_FUNCTION);

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
			!lastMessage.content.includes(`"error_occurred":true`))
	) {
		filterActionByType(maskedActionFunction, ActionType.FixError);
	}

	return maskedActionFunction;
};

export const processActionRequest = async (
	actionState: ActionState,
	modelInformation?: ModelInformation,
	uniqueId?: string,
	autoExecuteGeneratedCode = false,
): Promise<any> => {
	const systemPrompt = `You are a helpful agent that decides which action needs to be taken in the conversation. Only return the type of action to take.
- Always continue until the user's question is completely answered.
- Stop the conversation if an agent has asked for more information from the user.
- Ensure that the assistant has provided a clear result summary.
- The user's auto-execute preference is ${autoExecuteGeneratedCode}.`;

	const messages = formatMessages(systemPrompt, actionState, 5e3);
	const maskedActionFunction = maskActions(actionState);
	const availableActions = (
		maskedActionFunction.parameters!.properties as any
	).action.oneOf.map((action: any) => action.properties.type.const);

	const openai = getOpenAIClient(modelInformation);
	const model = getModelForRequest(modelInformation);

	try {
		const { trace, generation } = createTraceAndGeneration(
			"action",
			actionState,
			messages,
			model,
			uniqueId,
		);

		const response = await openai.chat.completions.create({
			model: model,
			messages: messages,
			tools: [{ type: "function", function: maskedActionFunction }],
			tool_choice: {
				type: "function",
				function: { name: "NextAction" },
			},
			temperature: 0.0,
			max_tokens: 256,
		});

		if (
			response.choices &&
			response.choices.length > 0 &&
			response.choices[0].message.tool_calls &&
			response.choices[0].message.tool_calls.length > 0
		) {
			const action = JSON.parse(
				response.choices[0].message.tool_calls[0].function.arguments,
			);

			if (
				!availableActions.includes(action.type) &&
				!availableActions.includes(action.action) &&
				!(
					action.action &&
					availableActions.includes(action.action.type)
				)
			) {
				action.type = ActionType.Code;
			}

			generation.end({
				output: action,
			});

			return action;
		} else {
			return { type: ActionType.Code };
		}
	} catch (error) {
		captureException(error);
		throw new Error("Error calling OpenAI API");
	}
};
