import { MessageType, UserSettings } from "./types/messages";

const themeBackgroundColors = {
	dark: "#111",
	light: "#fff",
};

export const getThemePrompt = (
	theme: "dark" | "light",
	userSettings?: UserSettings,
) => {
	let themePrompt = "";

	if (theme === "dark") {
		themePrompt += `- You use ${theme} mode with a background color of ${themeBackgroundColors[theme]}. Ensure visualizations have sufficient contrast.`;
	} else {
		themePrompt += `- You use default theming for ${theme} mode.`;
	}

	if (
		userSettings &&
		userSettings.primaryColor &&
		userSettings.primaryColor != "default"
	) {
		themePrompt += `- When choosing a color, use the following hex code as the primary color in visualizations: ${userSettings.primaryColor}\n`;
	}

	if (
		userSettings &&
		userSettings.secondaryColor &&
		userSettings.secondaryColor != "default"
	) {
		themePrompt += `- When choosing a secondary color, use the following hex code as the secondary color in visualizations: ${userSettings.secondaryColor}\n`;
	}

	return themePrompt;
};

export const getChatContextPrompt = (chatContext: string[]) => {
	if (chatContext.length) {
		return `The code that the user specifically highlighted is as follows: \n\n${chatContext.join(
			"\n\n",
		)}`;
	} else {
		return ``;
	}
};

export const limitMessages = (
	prevMessages: MessageType[],
	systemMessage: String,
	userMessage: MessageType,
	messagesAfterQuery: MessageType[],
	maxCharCount: number = 40000,
) => {	
	const combineAdjacentMessages = (messages: MessageType[]): MessageType[] => {
		return messages.reduce((acc: MessageType[], curr: MessageType) => {
			if (acc.length === 0 || acc[acc.length - 1].role !== curr.role) {
				acc.push(curr);
			} else {
				acc[acc.length - 1].content += '\n\n' + curr.content;
			}
			return acc;
		}, []);
	};

	// Combine adjacent messages for anthropic support
	let combinedPrevMessages = combineAdjacentMessages(prevMessages);
	let combinedMessagesAfterQuery = combineAdjacentMessages(messagesAfterQuery);

	let messages = [
		...combinedPrevMessages,
		userMessage,
		...combinedMessagesAfterQuery,
	];

	// Calculate the total character count of messages
	let totalCharacters = JSON.stringify(messages).length + systemMessage.length;

	// Trim prevMessages first until totalCharacters is under maxCharCount
	while (totalCharacters > maxCharCount && combinedPrevMessages.length > 0) {
		combinedPrevMessages.shift();
		messages = [
			...combinedPrevMessages,
			userMessage,
			...combinedMessagesAfterQuery,
		];
		totalCharacters = JSON.stringify(messages).length + systemMessage.length;
	}

	// If still over maxCharCount, trim combinedMessagesAfterQuery
	while (totalCharacters > maxCharCount && combinedMessagesAfterQuery.length > 0) {
		combinedMessagesAfterQuery.shift();
		messages = [
			...combinedPrevMessages,
			userMessage,
			...combinedMessagesAfterQuery,
		];
		totalCharacters = JSON.stringify(messages).length + systemMessage.length;
	}

	// For anthropic, messages should start with a user role
	if (messages[0].role !== "user") {
		let firstQuery: MessageType = {
			role: "user",
			content: "-->",
		}

		messages = [
			firstQuery,
			...messages,
		];
	}
	
	// For openai, messages should end with a user role
	if (messages[messages.length - 1].role !== "user") {
		let lastQuary: MessageType = {
			role: "user",
			content: "<--",
		}
		messages.push(lastQuary);	
	}

	return messages;
};
