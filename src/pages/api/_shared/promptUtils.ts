import { UserSettings } from "../../../components/modals/settings/SettingsModalStore";
import { NoterousMessage } from "../../../utils/magic/messages";

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

export const getUserSettingsPrompt = (userSettings: UserSettings) => {
	let prompt = "";

	if (userSettings.context) {
		prompt += `- The user has provided context that may come in handy. You MUST keep in mind the following context: ${userSettings.context}.\n`;
	}

	if (userSettings.responseStyle) {
		prompt += `- The user has requested you respond with the following style: ${userSettings.responseStyle}\n`;
	}

	return prompt.trim();
};

export const getFilesPrompt = (filePreviews: any) => {
	if (filePreviews && Object.keys(filePreviews).length > 0) {
		return `You will reference the files in the generated code when it makes sense. This object represents the files, where keys are filenames and values provide a preview of the data (if applicable). Don't reference the sample data, only the filename The files object looks like: ${JSON.stringify(
			filePreviews,
		)}.`;
	} else {
		return ``;
	}
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

export const limitPrevMessages = (
	prevMessages: NoterousMessage[],
	systemMessage: NoterousMessage,
	maxCharCount: number = 40000,
) => {
	let messages = [systemMessage, ...prevMessages];

	// Calculate the total character count of messages
	let totalCharacters = JSON.stringify(messages).length;

	// Trim prevMessages until totalCharacters is under 40k
	for (
		let i = 0;
		i < prevMessages.length && totalCharacters > maxCharCount;
		i++
	) {
		prevMessages = prevMessages.slice(1);
		messages = [systemMessage, ...prevMessages];
		totalCharacters = JSON.stringify(messages).length;
		if (prevMessages.length == 0) {
			// Make sure we do not get stuck in an infinite loop
			break;
		}
	}

	return messages;
};

export const limitMessages = (
	prevMessages: NoterousMessage[],
	systemMessage: NoterousMessage,
	userMessage: NoterousMessage,
	messagesAfterQuery: NoterousMessage[],
	maxCharCount: number = 40000,
) => {
	// Construct initial messages array with the required format
	let messages = [
		systemMessage,
		...prevMessages,
		userMessage,
		...messagesAfterQuery,
	];

	// Calculate the total character count of messages
	let totalCharacters = JSON.stringify(messages).length;

	// Trim prevMessages first until totalCharacters is under maxCharCount
	while (totalCharacters > maxCharCount && prevMessages.length > 0) {
		prevMessages.shift();
		messages = [
			systemMessage,
			...prevMessages,
			userMessage,
			...messagesAfterQuery,
		];
		totalCharacters = JSON.stringify(messages).length;
	}

	// If still over maxCharCount, trim messagesAfterQuery
	while (totalCharacters > maxCharCount && messagesAfterQuery.length > 0) {
		messagesAfterQuery.shift();
		messages = [
			systemMessage,
			...prevMessages,
			userMessage,
			...messagesAfterQuery,
		];
		totalCharacters = JSON.stringify(messages).length;
	}

	return messages;
};
