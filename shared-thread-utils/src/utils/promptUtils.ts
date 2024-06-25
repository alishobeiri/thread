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
	// Construct initial messages array with the required format
	let messages = [
		...prevMessages,
		userMessage,
		...messagesAfterQuery,
	];

	// Calculate the total character count of messages
	let totalCharacters = JSON.stringify(messages).length + systemMessage.length;

	// Trim prevMessages first until totalCharacters is under maxCharCount
	while (totalCharacters > maxCharCount && prevMessages.length > 0) {
		prevMessages.shift();
		messages = [
			...prevMessages,
			userMessage,
			...messagesAfterQuery,
		];
		totalCharacters = JSON.stringify(messages).length + systemMessage.length;
	}

	// If still over maxCharCount, trim messagesAfterQuery
	while (totalCharacters > maxCharCount && messagesAfterQuery.length > 0) {
		messagesAfterQuery.shift();
		messages = [
			...prevMessages,
			userMessage,
			...messagesAfterQuery,
		];
		totalCharacters = JSON.stringify(messages).length + systemMessage.length;
	}

	return messages;
};
