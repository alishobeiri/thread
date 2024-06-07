import { create } from "zustand";

interface OpenAISettingsModalState {
	showOpenAISettingsModal: boolean;
	setShowOpenAISettingsModal: (show: boolean) => void;
	openAIKey: string | null;
	setOpenAIKey: (key: string) => void;
}

export const useOpenAISettingsModalStore = create<OpenAISettingsModalState>(
	(set) => ({
		showOpenAISettingsModal: false,
		setShowOpenAISettingsModal: (show: boolean) => {
			set({ showOpenAISettingsModal: show });
		},
		openAIKey:
			typeof window !== "undefined"
				? localStorage.getItem("openaiApiKey")
				: null,
		setOpenAIKey: (key) => {
			if (typeof window !== "undefined") {
				localStorage.setItem("openaiApiKey", key);
			}
			set({ openAIKey: key });
		},
	}),
);
