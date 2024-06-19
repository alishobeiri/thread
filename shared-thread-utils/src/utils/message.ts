import { limitMessages } from "./promptUtils";
import { ActionState, NoterousMessage } from "./types/messages";

export const formatMessages = (
	systemPrompt: string,
	actionState: ActionState,
	characterLimit: number,
) => {
	const systemMessage: NoterousMessage = {
		role: "system",
		content: systemPrompt,
	};
	const prevMessages = actionState.prevMessages;
	const messagesAfterQuery = actionState.messagesAfterQuery;
	const userMessage = {
		role: "user",
		content: actionState.userRequest,
	} as NoterousMessage;

	return limitMessages(
		prevMessages,
		systemMessage,
		userMessage,
		messagesAfterQuery,
		characterLimit,
	);
};
