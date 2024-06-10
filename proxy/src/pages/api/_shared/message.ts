import { ActionState, NoterousMessage } from "../../../types/messages";
import { limitMessages } from "./promptUtils";

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
