import { limitMessages } from "./promptUtils";
import { ActionState, MessageType } from "./types/messages";

export const formatMessages = (
	systemPrompt: string,
	actionState: ActionState,
	characterLimit: number,
) => {
	const systemMessage: String = systemPrompt;
	const prevMessages = actionState.prevMessages;
	const messagesAfterQuery = actionState.messagesAfterQuery;
	const userMessage = {
		role: "user",
		content: actionState.userRequest,
	} as MessageType;

	return limitMessages(
		prevMessages,
		systemMessage,
		userMessage,
		messagesAfterQuery,
		characterLimit,
	);
};
