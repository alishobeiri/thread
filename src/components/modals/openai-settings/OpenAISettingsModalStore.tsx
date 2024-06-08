import { create } from "zustand";
import ConnectionManager from "../../../services/connection/connectionManager";

const SETTINGS_FILE_NAME = "settings.json";
const SETTINGS_DIR_PATH = ".thread-dev";
const SETTINGS_FILE_PATH = `${SETTINGS_DIR_PATH}/${SETTINGS_FILE_NAME}`;

const ensureSettingsExists = async () => {
	const contents = ConnectionManager.getInstance().serviceManager?.contents;
	try {
		await contents?.get(SETTINGS_DIR_PATH);
	} catch (error) {
		await contents
			?.newUntitled({
				path: "/",
				type: "directory",
			})
			.then((folder) => {
				contents.rename(folder.path, SETTINGS_DIR_PATH);
			});
	}

	try {
		await contents?.get(SETTINGS_FILE_PATH);
	} catch (error) {
		await contents
			?.newUntitled({
				path: "/",
				ext: "json",
				type: "file",
			})
			.then((settingsFile) => {
				contents.rename(settingsFile.path, SETTINGS_FILE_PATH);
			});
	}
};

interface OpenAISettingsModalState {
	showOpenAISettingsModal: boolean;
	setShowOpenAISettingsModal: (show: boolean) => void;
	openAIKey: string | undefined;
	setOpenAIKey: (key: string) => void;
	fetchOpenAIKey: () => Promise<string | undefined>;
}

export const useOpenAISettingsModalStore = create<OpenAISettingsModalState>(
	(set, get) => ({
		showOpenAISettingsModal: false,
		setShowOpenAISettingsModal: (show: boolean) =>
			set({ showOpenAISettingsModal: show }),
		openAIKey: undefined,
		setOpenAIKey: async (key: string) => {
			const connectionManager = ConnectionManager.getInstance();
			await connectionManager.isServiceReady();
			const contentsManager = connectionManager.serviceManager?.contents;

			if (typeof window !== "undefined" && contentsManager) {
				try {
					// Ensure the required directory exists
					await ensureSettingsExists();

					const file = await contentsManager.get(SETTINGS_FILE_PATH);
					const fileContent = JSON.parse(file.content);
					fileContent.openaiApiKey = key;

					await contentsManager.save(SETTINGS_FILE_PATH, {
						type: "file",
						format: "text",
						content: JSON.stringify(fileContent, null, 2),
					});
				} catch (error) {
					// Initialize the file if not existing
					await contentsManager.save(SETTINGS_FILE_PATH, {
						type: "file",
						format: "text",
						content: JSON.stringify({ openaiApiKey: key }, null, 2),
					});
				}
			}

			set({ openAIKey: key });
		},
		fetchOpenAIKey: async () => {
			const connectionManager = ConnectionManager.getInstance();
			await connectionManager.isServiceReady();
			const contentsManager = connectionManager.serviceManager?.contents;

			if (typeof window !== "undefined" && contentsManager) {
				try {
					// Ensure the required directory exists
					await ensureSettingsExists();

					const file = await contentsManager.get(SETTINGS_FILE_PATH);
					const fileContent = JSON.parse(file.content);
					set({ openAIKey: fileContent.openaiApiKey || undefined });
					return fileContent.openaiApiKey;
				} catch (error) {
					// Initialize the file if not existing
					await contentsManager.save(SETTINGS_FILE_PATH, {
						type: "file",
						format: "text",
						content: JSON.stringify({ openaiApiKey: "" }, null, 2),
					});
					set({ openAIKey: undefined });
				}
			}

			return undefined;
		},
	}),
);
