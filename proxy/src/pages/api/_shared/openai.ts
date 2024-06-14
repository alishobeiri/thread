import OpenAI from "openai";
import { ModelInformation } from "./model";

// Azure example: https://github.com/openai/openai-node/blob/b595cd953a704dba2aef4c6c3fa431f83f18ccf9/examples/azure.ts
const OPENAI_API_KEY: string = process.env.OPENAI_API_KEY || "";
const OPENAI_BASE_URL: string = process.env.OPENAI_BASE_URL || "";
const AZURE_API_KEY: string = process.env.AZURE_OPENAI_API_KEY || "";
const AZURE_RESOURCE_NAME: string =
	process.env.AZURE_OPENAI_RESOURCE_NAME || "";
const AZURE_DEPLOYMENT_NAME: string =
	process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "";
const AZURE_OPENAI_API_VERSION: string =
	process.env.AZURE_OPENAI_API_VERSION || "";

// Azure configuration
const AZURE_CONFIG: {
	apiKey: string;
	baseURL: string;
	defaultQuery: Record<string, string>;
	defaultHeaders: Record<string, string>;
} = {
	apiKey: AZURE_API_KEY,
	baseURL: `https://${AZURE_RESOURCE_NAME}.openai.azure.com/openai/deployments/${AZURE_DEPLOYMENT_NAME}`,
	defaultQuery: { "api-version": AZURE_OPENAI_API_VERSION },
	defaultHeaders: { "api-key": AZURE_API_KEY },
};

// OpenAI configuration
const OPENAI_CONFIG: {
	apiKey: string;
	baseURL: string;
} = {
	apiKey: OPENAI_API_KEY,
	baseURL: OPENAI_BASE_URL,
};

export const openai = new OpenAI(OPENAI_CONFIG);
export const azure_openai = new OpenAI(AZURE_CONFIG);

// shoutout ollama compatibility with openai: https://ollama.com/blog/openai-compatibility
export const getOpenAIClient = (modelInformation?: ModelInformation) => {
	const { openAIKey, openAIBaseURL, ollamaUrl, modelType } =
		modelInformation || {};

	const config =
		modelType === "ollama"
			? {
					baseURL: ollamaUrl || "http://0.0.0.0:11434/v1",
					apiKey: "ollama",
			  }
			: {
					apiKey: openAIKey || OPENAI_API_KEY,
					baseURL: openAIBaseURL || OPENAI_BASE_URL,
			  };

	if (!config.apiKey) {
		throw new Error("No OpenAI API key provided");
	}

	return new OpenAI(config);
};
