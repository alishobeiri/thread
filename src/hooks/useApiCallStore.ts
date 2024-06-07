import { create } from "zustand";

interface ApiCallState {
	apiCallCount: number;
	incrementApiCallCount: () => void;
	resetApiCallCount: () => void;
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
}));

export default useApiCallStore;
