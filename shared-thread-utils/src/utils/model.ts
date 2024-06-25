export type ModelInformation = {
	openAIKey?: string;
	openAIBaseUrl?: string;
	ollamaUrl?: string;
	ollamaModel?: string;
	modelType?: string;
};

export const getModelForRequest = (modelInformation?: ModelInformation) => {
	const { modelType, ollamaModel } = modelInformation || {};

	if (modelType === "ollama") {
		return ollamaModel || "";
	}

	return "gpt-4o";
};

export const getAPIKeyForRequest = (modelInformation?: ModelInformation) => {
	const { modelType, openAIKey } = modelInformation || {};

	const OPENAI_API_KEY: string = process.env.OPENAI_API_KEY || "";

	if (modelType === "ollama") {
		return "EMPTY";
	}

	return openAIKey || OPENAI_API_KEY;
};

export const getBaseURLForRequest = (modelInformation?: ModelInformation) => {
	const { modelType, openAIBaseUrl, ollamaUrl } = modelInformation || {};

	const OPENAI_BASE_URL: string =
		process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";

	if (modelType === "ollama") {
		return ollamaUrl || "http://0.0.0.0:11434/v1";
	}

	return openAIBaseUrl || OPENAI_BASE_URL;
};
