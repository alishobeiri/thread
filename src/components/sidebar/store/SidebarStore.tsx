import { create } from "zustand";
import {
	CHAT_PANEL_ID,
	FILESYSTEM_PANEL_ID,
} from "../../../utils/constants/constants";
import { useChatStore } from "../chat/store/ChatStore";

const SIDEBAR_WIDTH_KEY = "vizlyNotebookSidebarWidth";
const SIDEBAR_EXPANDED_KEY = "vizlyNotebookSidebarExpanded";
const DEFAULT_SIDEBAR_WIDTH = 350;
export const MIN_SIDEBAR_WIDTH = 200;
export const MAX_SIDEBAR_WIDTH = 600;

interface SidebarState {
	textInputRef: HTMLTextAreaElement | null;
	panelType: string;
	isExpanded: boolean;
	sidebarWidth: number;
	setTextInputRef: (textInputRef: HTMLTextAreaElement) => void;
	setPanelType: (panelType: string) => void;
	setIsExpanded: (isExpanded: boolean) => void;
	initializeSidebar: () => void;
	setSidebarWidth: (width: number) => void;
	toggleOpen: () => void;
	openChat: () => void;
	openFileSystem: () => void;
	openChatAndSetSelection: (selection?: string) => void;
	initializeChat: (selection: string) => void;
}

export const useSidebarStore = create<SidebarState>((set, get) => ({
	textInputRef: null,
	panelType: FILESYSTEM_PANEL_ID,
	isExpanded: false,
	sidebarWidth: DEFAULT_SIDEBAR_WIDTH,
	setTextInputRef: (textInputRef: HTMLTextAreaElement) =>
		set(() => ({ textInputRef })),
	setPanelType: (panelType) => set(() => ({ panelType })),
	setIsExpanded: (isExpanded: boolean) => {
		if (typeof window !== "undefined") {
			localStorage.setItem(
				SIDEBAR_EXPANDED_KEY,
				JSON.stringify(isExpanded),
			);
		}
		set(() => ({ isExpanded }));
	},
	setSidebarWidth: (width: number) => {
		const newWidth = Math.max(
			MIN_SIDEBAR_WIDTH,
			Math.min(width, MAX_SIDEBAR_WIDTH),
		);
		if (typeof window !== "undefined") {
			localStorage.setItem(SIDEBAR_WIDTH_KEY, newWidth.toString());
		}
		set(() => ({ sidebarWidth: newWidth }));
	},
	initializeSidebar: () => {
		if (typeof window !== "undefined") {
			const storedWidth = localStorage.getItem(SIDEBAR_WIDTH_KEY);
			const storedExpanded = localStorage.getItem(SIDEBAR_EXPANDED_KEY);

			if (storedWidth) {
				set(() => ({
					sidebarWidth:
						parseInt(storedWidth, 10) || DEFAULT_SIDEBAR_WIDTH,
				}));
			}
			if (storedExpanded) {
				set(() => ({
					isExpanded: JSON.parse(storedExpanded) || false,
				}));
			}
		}
	},
	initializeSidebarWidth: () => {
		if (typeof window !== "undefined") {
			const storedWidth = localStorage.getItem(SIDEBAR_WIDTH_KEY);
			if (storedWidth) {
				set(() => ({
					sidebarWidth:
						parseInt(storedWidth, 10) || DEFAULT_SIDEBAR_WIDTH,
				}));
			}
		}
	},
	toggleOpen: () => {
		set((state) => {
			if (state.panelType === "" && state.isExpanded === false) {
				return { panelType: CHAT_PANEL_ID, isExpanded: true };
			}
			return { isExpanded: !state.isExpanded };
		});
	},
	openChat: () => {
		set((state) => {
			state.textInputRef?.focus();
			return { isExpanded: true, panelType: CHAT_PANEL_ID };
		});
	},
	openFileSystem: () => {
		set(() => ({
			isExpanded: true,
			panelType: FILESYSTEM_PANEL_ID,
		}));
	},
	openChatAndSetSelection: (selection?: string) => {
		if (selection) {
			useChatStore.getState().addChatContext(selection);
		}
		get().openChat();
		get().textInputRef?.focus();
	},
	initializeChat: (selection: string = "") => {
		const { askChatAssistant } = useChatStore.getState();
		set(() => ({
			isExpanded: true,
			panelType: CHAT_PANEL_ID,
		}));

		askChatAssistant(`${selection}`);
	},
}));
