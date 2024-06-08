import { create } from "zustand";
import { useOpenAISettingsModalStore } from "../components/modals/openai-settings/OpenAISettingsModalStore";
import { useQueryLimitModalStore } from "../components/modals/query-limit/QueryLimitModalStore";

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
			? parseInt(localStorage.getItem("threadApiCallCount") || "0", 10)
			: 0,
	incrementApiCallCount: () =>
		set((state) => {
			const newCount = state.apiCallCount + 1;
			localStorage.setItem("threadApiCallCount", newCount.toString());
			return { apiCallCount: newCount };
		}),
	resetApiCallCount: () =>
		set(() => {
			localStorage.setItem("threadApiCallCount", "0");
			return { apiCallCount: 0 };
		}),
	checkAndIncrementApiCallCount: () => {
		const { apiCallCount, incrementApiCallCount } =
			useApiCallStore.getState();
		const openaiApiKey = useOpenAISettingsModalStore
			.getState()
			.fetchOpenAIKey();

		if (openaiApiKey) {
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
