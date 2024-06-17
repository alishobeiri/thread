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
