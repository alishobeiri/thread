import { captureException } from "@sentry/nextjs";
import { cloneDeep } from "lodash";
import { NextApiRequest, NextApiResponse } from "next";
import { FunctionDefinition } from "openai/resources";
import { ActionState } from "../../../../types/messages";
import { formatMessages } from "../../_shared/message";
import { getModelForRequest } from "../../_shared/model";
import { getOpenAIClient } from "../../_shared/openai";

enum ActionType {
	Code = "code",
	FixError = "fixError",
	Stop = "stop",
}

const ACTION_NAME = "NextAction";

type ConditionalProperties<T, B extends boolean> = B extends true
	? T
	: Omit<T, "reason">;

type ActionPropertyBase<T extends string> = {
	type: {
		type: "string";
		const: T;
	};
	reason?: {
		type: "string";
		description: string;
	};
};

type ActionProperty<T extends boolean = true> = {
	oneOf: Array<{
		type: "object";
		description: string;
		properties: ConditionalProperties<
			ActionPropertyBase<ActionType> & Record<string, any>,
			T
		>;
		required: Array<
			keyof ConditionalProperties<
				ActionPropertyBase<ActionType> & Record<string, any>,
				T
			>
		>;
	}>;
	description: "The action to be performed";
};

const isDevelopment = process.env.NODE_ENV === "development";

const actionProperty: ActionProperty<typeof isDevelopment> = {
	oneOf: [
		{
			type: "object",
			description: `Conditions you should return '${ActionType.Code}':
- The user has asked you to complete an action that can be completed using code.
- The assistant needs to execute code as the next step in the conversation or to complete the user's request.
- The user has asked a question that can be answered by loading of the files provided.`,
			properties: {
				type: {
					type: "string",
					const: ActionType.Code,
				},
				...(isDevelopment
					? {
							reason: {
								type: "string",
								description: "The reason for returning code.",
							},
					  }
					: {}),
			},
			required: isDevelopment ? ["type", "reason"] : ["type"],
		},
		{
			type: "object",
			description: `Conditions you should return '${ActionType.FixError}':
- The previous cell execution ran into an error. 
- The execution has repeated the same error and needs to be fixed.`,
			properties: {
				type: {
					type: "string",
					const: ActionType.FixError,
				},
				...(isDevelopment
					? {
							reason: {
								type: "string",
								description:
									"The reason for returning fixError.",
							},
					  }
					: {}),
			},
			required: isDevelopment ? ["type", "reason"] : ["type"],
		},
		{
			type: "object",
			description: `Conditions you should return '${ActionType.Stop}':
- The user must answer the assistant's question before you can proceed.
- You are awaiting for the user's input. You must return '${ActionType.Stop}' in this case.
- The user's answer has been completely answered and a result summary has been provided.
- If you are about to repeat yourself. Because you shouldn't repeat yourself, you must return '${ActionType.Stop}'.
- If you have already discussed having insufficient information from the user, you must return '${ActionType.Stop}'.`,
			properties: {
				type: {
					type: "string",
					const: ActionType.Stop,
				},
				...(isDevelopment
					? {
							reason: {
								type: "string",
								description: "The reason for stopping.",
							},
					  }
					: {}),
			},
			required: isDevelopment ? ["type", "reason"] : ["type"],
		},
	],
	description: "The action to be performed",
};

const ACTION_FUNCTION: FunctionDefinition = {
	name: ACTION_NAME,
	description:
		"The function to call after deciding what action to take in the conversation.",
	parameters: {
		type: "object",
		properties: {
			action: actionProperty,
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

const maskActions = (actionState: ActionState) => {
	// Create a deep copy of ACTION_FUNCTION
	const maskedActionFunction = cloneDeep(ACTION_FUNCTION);

	const lastMessage =
		actionState.messagesAfterQuery &&
		actionState.messagesAfterQuery.length != 0
			? actionState.messagesAfterQuery[
					actionState.messagesAfterQuery.length - 1
			  ]
			: null;

	if (actionState.firstQuery) {
		// Do not allow stopping on the first query
		filterActionByType(maskedActionFunction, ActionType.Stop);
	}

	const prevAction =
		actionState.prevActions[actionState.prevActions.length - 1];

	if (
		actionState.firstQuery ||
		(lastMessage && lastMessage.role != "assistant") ||
		(lastMessage &&
			lastMessage.role == "assistant" &&
			!lastMessage.content.includes(`"error_occurred":true`))
	) {
		filterActionByType(maskedActionFunction, ActionType.FixError);
	}

	// Return the modified function
	return maskedActionFunction;
};

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	if (req.method === "POST") {
		let {
			actionState,
			openaiApiKey,
			uniqueId,
		}: {
			actionState: ActionState;
			openaiApiKey: string | undefined;
			uniqueId: string | undefined;
		} = req.body;

		const systemPrompt = `You are a helpful agent that decides which action needs to be taken in the conversation. You only return the type of action to take, you do not try to perform the action or generate any other value related to performing the action.
Your instructions:
- Only return the type of action to take. Please do not return anything other than the type of action to take.
- Please only choose actions from the list of actions defined in the tool call, do not make up your own.
- You MUST ALWAYS continue until the user's question is completely answered.
- If the agent presented a table, but has not provided a visualization, try to ask it to generate code again so it does so.
- You MUST stop the conversation if an agent has asked for more information from the user (e.g. the user needs to upload a file).
- You use ONLY the previous user/assistant conversation from the user and assistant to decide which action to take. You do not use your own opinion to decide whether or not to continue.
- If the assistant has said "lets proceed" or "let us now", it means they are not done completing their action and should continue.
- You ALWAYS ensure that the assistant has provided a clear result summary.
- You must stop if the assistant requires a user response.
- If the assistant has started to repeat themselves without making any progress, you must stop.
- If the assistant has faced an error that it can't recover from without user intervention, please notify the user of the issue using markdown.
- The previous actions are: ${actionState.prevActions}, if the assistant has been trying to 'fixError' repeatedly, try to produce a markdown action to explain to the user what is going on.`;

		const messages = formatMessages(systemPrompt, actionState, 5e3);

		const maskedActionFunction = maskActions(actionState);

		const availableActions = (
			maskedActionFunction.parameters!.properties as any
		).action.oneOf.map((action: any) => action.properties.type.const);

		const openai = getOpenAIClient(openaiApiKey);

		try {
			const model = getModelForRequest();

			const response = await openai.chat.completions.create({
				model: model,
				messages: messages,
				tools: [{ type: "function", function: maskedActionFunction }],
				tool_choice: {
					type: "function",
					function: { name: ACTION_NAME },
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
				console.log(
					response.choices[0].message.tool_calls[0].function
						.arguments,
				);

				// Reset the argument to be `code` if it is not in the list of supported actions
				const action = JSON.parse(
					response.choices[0].message.tool_calls[0].function
						.arguments,
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

				res.status(200).json(action);
			} else {
				res.status(200).json({});
			}
		} catch (error) {
			captureException(error);
			console.error("Error calling OpenAI API:", error);
			res.status(500).json({ message: "Error calling OpenAI API" });
		}
	} else if (req.method === "OPTIONS") {
		return res.status(200).json({ status: 200 });
	} else {
		// Handle any non-POST requests
		res.setHeader("Allow", ["POST"]);
		res.status(405).end(`Method ${req.method} Not Allowed`);
	}
}
