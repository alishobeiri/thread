import { ActionState } from "../../../utils/magic/magicQuery";
import { ThreadNotebookMessage } from "../../../utils/magic/messages";
import { limitMessages } from "./promptUtils";

export const formatMessages = (
	systemPrompt: string,
	actionState: ActionState,
	characterLimit: number,
) => {
	const systemMessage: ThreadNotebookMessage = {
		role: "system",
		content: systemPrompt,
	};
	const prevMessages = actionState.prevMessages;
	const messagesAfterQuery = actionState.messagesAfterQuery;
	const userMessage = {
		role: "user",
		content: actionState.userRequest,
	} as ThreadNotebookMessage;

	return limitMessages(
		prevMessages,
		systemMessage,
		userMessage,
		messagesAfterQuery,
		characterLimit,
	);
};
