import { create } from "zustand";

interface QueryLimitModalState {
	showQueryLimitModal: boolean;
	setShowQueryLimitModal: (show: boolean) => void;
}

export const useQueryLimitModalStore = create<QueryLimitModalState>((set) => ({
	showQueryLimitModal: false,
	setShowQueryLimitModal: (show: boolean) => {
		set({ showQueryLimitModal: show });
	},
}));
