import OpenAI from "openai";

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

export const getOpenAIClient = (apiKey?: string, serverUrl?: string) => {
	const apiKeyToUse = apiKey || OPENAI_API_KEY;
	if (!apiKeyToUse) {
		throw new Error("No OpenAI API key provided");
	}
	const baseUrl = serverUrl ?? OPENAI_BASE_URL;
	let config;
	if (baseUrl) {
		config = { apiKey: apiKeyToUse, baseURL: baseUrl };
	} else {
		config = { apiKey: apiKeyToUse };
	}
	return new OpenAI(config);
};
