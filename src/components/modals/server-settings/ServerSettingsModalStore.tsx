import { create } from "zustand";
import ConnectionManager, {
	useConnectionManagerStore,
} from "../../../services/connection/connectionManager";
import { API_URL } from "../../../utils/constants/constants";
import { captureMessage } from "@sentry/nextjs";

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

interface ServerSettingsModalState {
	showServerSettingsModal: boolean;
	openAIBaseURL: string | undefined;
	openAIKey: string | undefined;
	serverProxyURL: string | undefined;
	setShowServerSettingsModal: (show: boolean) => void;
	setSettings: ({
		openAIBaseURL,
		openAIKey,
		serverProxyURL,
	}: {
		openAIBaseURL?: string;
		openAIKey?: string;
		serverProxyURL?: string;
	}) => Promise<void>;
	fetchSettings: () => Promise<void>;
	getServerProxyUrl: () => string;
	getAdditionalRequestMetadata: () => Object;
}

export const useServerSettingsModalStore = create<ServerSettingsModalState>(
	(set, get) => ({
		showServerSettingsModal: false,
		setShowServerSettingsModal: (show: boolean) =>
			set({ showServerSettingsModal: show }),
		openAIKey: undefined,
		openAIBaseURL: undefined,
		serverProxyURL: API_URL,

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
			console.log("Server settings: ", settingsContent);
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
						...fileContent,
					});
				} catch (error) {
					console.error(
						"Error occurred when fetching settings: ",
						error,
					);
				}
			}
		},
		getServerProxyUrl: () => {
			const serverProxyURL = get().serverProxyURL;
			if (!serverProxyURL || serverProxyURL == "") {
				return API_URL;
			}
			return serverProxyURL;
		},
		getAdditionalRequestMetadata: () => {
			return {
				openAIKey: get().openAIKey,
				openAIBaseURL: get().openAIBaseURL,
				uniqueId: useConnectionManagerStore.getState().uniqueId,
			};
		},
	}),
);
