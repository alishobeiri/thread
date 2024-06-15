import { captureMessage } from "@sentry/nextjs";
import create from "zustand";
import ConnectionManager, {
	useConnectionManagerStore,
} from "../../../services/connection/connectionManager";

const SETTINGS_FILE_NAME = "settings.json";
const SETTINGS_DIR_PATH = ".thread-dev";
const SETTINGS_FILE_PATH = `${SETTINGS_DIR_PATH}/${SETTINGS_FILE_NAME}`;

const saveDefaultSettingsFile = async () => {
	const contents = ConnectionManager.getInstance().serviceManager?.contents;
	try {
		await contents?.save(SETTINGS_FILE_PATH, {
			type: "file",
			format: "text",
			content: JSON.stringify(
				{
					openAIBaseURL: "",
					openAIKey: "",
					serverProxyURL: "",
					ollamaUrl: "",
					ollamaModel: "",
					modelType: "openai",
				},
				null,
				2,
			),
		});
	} catch (error) {
		console.error(error);
	}
};

const ensureSettingsExists = async () => {
	await ConnectionManager.getInstance().isServiceReady();
	const contents = ConnectionManager.getInstance().serviceManager?.contents;
	if (!contents) {
		captureMessage("Contents was undefined");
		return;
	}
	try {
		await contents.get(SETTINGS_DIR_PATH);
	} catch (error) {
		console.error("Error encountered: ", error);
		const folder = await contents?.newUntitled({
			path: "/",
			type: "directory",
		});
		if (folder) {
			await contents?.rename(folder?.path, SETTINGS_DIR_PATH);
			await saveDefaultSettingsFile();
		} else {
			captureMessage("Folder rename failed");
			return;
		}
	}
};

type ModelType = "openai" | "ollama";

interface ModelSettingsState {
	showModelSettingsModal: boolean;
	openAIKey: string;
	openAIBaseURL: string;
	serverProxyURL: string;
	ollamaUrl: string;
	ollamaModel: string;
	modelType: ModelType;
	setShowModelSettingsModal: (show: boolean) => void;
	setOpenAIKey: (key: string) => void;
	setOpenAIBaseURL: (url: string) => void;
	setServerProxyURL: (url: string) => void;
	setOllamaUrl: (url: string) => void;
	setOllamaModel: (model: string) => void;
	setModelType: (type: ModelType) => void;
	fetchSettings: () => Promise<void>;
	setSettings: (settings: {
		openAIBaseURL: string;
		openAIKey: string;
		serverProxyURL: string;
		ollamaUrl: string;
		ollamaModel: string;
		modelType: ModelType;
	}) => Promise<void>;
	getAdditionalRequestMetadata: () => Object;
}

export const useModelSettingsModalStore = create<ModelSettingsState>(
	(set, get) => ({
		showModelSettingsModal: false,
		openAIKey: "",
		openAIBaseURL: "",
		serverProxyURL: "",
		ollamaUrl: "",
		ollamaModel: "",
		modelType: "openai",
		setShowModelSettingsModal: (show) =>
			set({ showModelSettingsModal: show }),
		setOpenAIKey: (key) => set({ openAIKey: key }),
		setOpenAIBaseURL: (url) => set({ openAIBaseURL: url }),
		setServerProxyURL: (url) => set({ serverProxyURL: url }),
		setOllamaUrl: (url) => set({ ollamaUrl: url }),
		setOllamaModel: (model) => set({ ollamaModel: model }),
		setModelType: (type) => set({ modelType: type }),
		fetchSettings: async () => {
			const connectionManager = ConnectionManager.getInstance();
			await connectionManager.isServiceReady();
			const contentsManager = connectionManager.serviceManager?.contents;

			if (typeof window !== "undefined" && contentsManager) {
				try {
					await ensureSettingsExists();

					const file = await contentsManager.get(SETTINGS_FILE_PATH);
					const fileContent = JSON.parse(file.content);

					set({
						openAIKey: fileContent.openAIKey || "",
						openAIBaseURL: fileContent.openAIBaseURL || "",
						serverProxyURL: fileContent.serverProxyURL || "",
						ollamaUrl: fileContent.ollamaUrl || "",
						ollamaModel: fileContent.ollamaModel || "",
						modelType: fileContent.modelType || "openai",
					});
				} catch (error) {
					console.error(
						"Error occurred when fetching settings: ",
						error,
					);
				}
			}
		},
		setSettings: async (settings) => {
			const connectionManager = ConnectionManager.getInstance();
			await connectionManager.isServiceReady();
			const contentsManager = connectionManager.serviceManager?.contents;
			const settingsContent = JSON.stringify(
				{
					...settings,
				},
				null,
				2,
			);
			try {
				await contentsManager?.save(SETTINGS_FILE_PATH, {
					type: "file",
					format: "text",
					content: settingsContent,
				});
				// Update the state after the settings are saved
				set((state) => ({
					...state,
					...settings,
				}));
			} catch (error) {
				console.error("Error saving settings: ", error);
			}
		},
		getAdditionalRequestMetadata: () => {
			return {
				modelInformation: {
					openAIKey: get().openAIKey,
					openAIBaseURL: get().openAIBaseURL,
					ollamaUrl: get().ollamaUrl,
					ollamaModel: get().ollamaModel,
					modelType: get().modelType,
				},
				uniqueId: useConnectionManagerStore.getState().uniqueId,
			};
		},
	}),
);
