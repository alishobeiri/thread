import { captureException, captureMessage } from "@sentry/nextjs";
import { create } from "zustand";
import ConnectionManager, {
	useConnectionManagerStore,
} from "../../services/connection/connectionManager";
import { API_URL } from "../../utils/constants/constants";

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

interface SettingsState {
	showModelSettingsModal: boolean;
	showServerSettingsModal: boolean;
	openAIKey: string;
	openAIBaseURL: string;
	serverProxyURL: string;
	ollamaURL: string;
	ollamaModel: string;
	modelType: ModelType;
	autoExecuteGeneratedCode: boolean;
	setShowModelSettingsModal: (show: boolean) => void;
	setShowServerSettingsModal: (show: boolean) => void;
	setOpenAIKey: (key: string) => void;
	setOpenAIBaseURL: (url: string) => void;
	setServerProxyURL: (url: string) => void;
	getServerProxyURL: () => string;
	setOllamaURL: (url: string) => void;
	setOllamaModel: (model: string) => void;
	setModelType: (type: ModelType) => void;
	fetchSettings: () => Promise<void>;
	setSettings: (settings: Partial<SettingsState>) => Promise<void>;
	getAdditionalRequestMetadata: () => Object;
	setAutoExecuteGeneratedCode: (autoExecuteGeneratedCode: boolean) => void;
	saveSettings: (newSettings: Partial<SettingsState>) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
	showModelSettingsModal: false,
	showServerSettingsModal: false,
	autoExecuteGeneratedCode: false,
	openAIKey: "",
	openAIBaseURL: "",
	serverProxyURL: "",
	ollamaURL: "",
	ollamaModel: "",
	modelType: "openai",
	setShowModelSettingsModal: (show) => set({ showModelSettingsModal: show }),
	setShowServerSettingsModal: (show: boolean) =>
		set({ showServerSettingsModal: show }),
	setOpenAIKey: (key) => {
		set({ openAIKey: key });
		get().saveSettings({ openAIKey: key });
	},
	setOpenAIBaseURL: (url) => {
		set({ openAIBaseURL: url });
		get().saveSettings({ openAIBaseURL: url });
	},
	setServerProxyURL: (url) => {
		set({ serverProxyURL: url });
		get().saveSettings({ serverProxyURL: url });
	},
	getServerProxyURL: () => {
		const serverProxyURL = get().serverProxyURL;
		if (!serverProxyURL || serverProxyURL == "") {
			return API_URL;
		}
		return serverProxyURL;
	},
	setOllamaURL: (url) => {
		set({ ollamaURL: url });
		get().saveSettings({ ollamaURL: url });
	},
	setOllamaModel: (model) => {
		set({ ollamaModel: model });
		get().saveSettings({ ollamaModel: model });
	},
	setModelType: (type) => {
		set({ modelType: type });
		get().saveSettings({ modelType: type });
	},
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
					ollamaURL: fileContent.ollamaURL || "",
					ollamaModel: fileContent.ollamaModel || "",
					modelType: fileContent.modelType || "openai",
				});
			} catch (error) {
				console.error("Error occurred when fetching settings: ", error);
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
				ollamaUrl: get().ollamaURL,
				ollamaModel: get().ollamaModel,
				modelType: get().modelType,
			},
			uniqueId: useConnectionManagerStore.getState().uniqueId,
		};
	},
	setAutoExecuteGeneratedCode: async (autoExecuteGeneratedCode: boolean) => {
		set({ autoExecuteGeneratedCode });
		get().saveSettings({ autoExecuteGeneratedCode });
	},
	saveSettings: async (newSettings: Partial<SettingsState>) => {
		const connectionManager = ConnectionManager.getInstance();
		await connectionManager.isServiceReady();
		try {
			const result = await connectionManager.getFileContents(
				SETTINGS_FILE_PATH,
			);
			let prevSettings: Partial<SettingsState> = {};
			if (result.content) {
				try {
					prevSettings = JSON.parse(result.content);
				} catch (e) {
					captureException(e);
					console.error(e);
				}
			}

			const updatedSettings: Partial<SettingsState> = {
				openAIBaseURL: prevSettings.openAIBaseURL || "",
				openAIKey: prevSettings.openAIKey || "",
				serverProxyURL: prevSettings.serverProxyURL || "",
				ollamaURL: prevSettings.ollamaURL || "",
				ollamaModel: prevSettings.ollamaModel || "",
				modelType: prevSettings.modelType || "openai",
				autoExecuteGeneratedCode:
					prevSettings.autoExecuteGeneratedCode || false,
				showModelSettingsModal:
					prevSettings.showModelSettingsModal || false,
				showServerSettingsModal:
					prevSettings.showServerSettingsModal || false,
				...newSettings,
			};

			await get().setSettings(updatedSettings);
		} catch (error) {
			console.error("Error saving settings: ", error);
		}
	},
}));
