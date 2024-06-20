import OpenAI from "openai";
import { ModelInformation } from "./model";

// Azure example: https://github.com/openai/openai-node/blob/b595cd953a704dba2aef4c6c3fa431f83f18ccf9/examples/azure.ts
const OPENAI_API_KEY: string = process.env.OPENAI_API_KEY || "";
const OPENAI_BASE_URL: string = process.env.OPENAI_BASE_URL || "";

// shoutout ollama compatibility with openai: https://ollama.com/blog/openai-compatibility
export const getOpenAIClient = (modelInformation?: ModelInformation) => {
	const { openAIKey, openAIBaseUrl, ollamaUrl, modelType } =
		modelInformation || {};

	const config =
		modelType === "ollama"
			? {
					baseURL: ollamaUrl || "http://0.0.0.0:11434/v1",
					apiKey: "ollama",
			  }
			: {
					apiKey: openAIKey || OPENAI_API_KEY,
					baseURL: openAIBaseUrl || OPENAI_BASE_URL,
			  };

	if (!config.apiKey) {
		throw new Error("No OpenAI API key provided");
	}

	return new OpenAI(config);
};
