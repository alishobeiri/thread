import { create } from "zustand";

interface InvalidConnectionModalState {
	showInvalidConnection: boolean;
	setShowInvalidConnectionModal: (show: boolean) => void;
}

export const useInvalidConnectionModalStore =
	create<InvalidConnectionModalState>((set) => ({
		showInvalidConnection: false,
		setShowInvalidConnectionModal: (show: boolean) => {
			set({ showInvalidConnection: show });
		},
	}));
