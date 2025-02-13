import { create } from "zustand";
import { useQueryLimitModalStore } from "../components/modals/query-limit/QueryLimitModalStore";
import { useSettingsStore } from "../components/settings/SettingsStore";

interface ApiCallState {
	apiCallCount: number;
	incrementApiCallCount: () => void;
	resetApiCallCount: () => void;
	checkAndIncrementApiCallCount: () => boolean;
}

export const MAX_AI_API_CALLS = 25;

const useApiCallStore = create<ApiCallState>((set) => ({
	apiCallCount:
		typeof window !== "undefined"
			? parseInt(
					localStorage.getItem("vizlyNotebookApiCallCount") || "0",
					10,
			  )
			: 0,
	incrementApiCallCount: () =>
		set((state) => {
			const newCount = state.apiCallCount + 1;
			localStorage.setItem(
				"vizlyNotebookApiCallCount",
				newCount.toString(),
			);
			return { apiCallCount: newCount };
		}),
	resetApiCallCount: () =>
		set(() => {
			localStorage.setItem("vizlyNotebookApiCallCount", "0");
			return { apiCallCount: 0 };
		}),
	checkAndIncrementApiCallCount: () => {
		const { apiCallCount, incrementApiCallCount } =
			useApiCallStore.getState();
		const isLocal = useSettingsStore.getState().isLocal;
		const openaiApiKey = useSettingsStore.getState().openAIKey;
		const serverProxyUrl = useSettingsStore.getState().serverProxyUrl;

		if (isLocal || openaiApiKey || serverProxyUrl != "") {
			return true;
		}

		if (apiCallCount >= MAX_AI_API_CALLS) {
			useQueryLimitModalStore.getState().setShowQueryLimitModal(true);
			return false;
		}

		incrementApiCallCount();
		return true;
	},
}));

export default useApiCallStore;
