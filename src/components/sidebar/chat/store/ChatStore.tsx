import { v4 as uuidv4 } from "uuid";
import { create } from "zustand";
import useApiCallStore from "../../../../hooks/useApiCallStore";
import ConnectionManager from "../../../../services/connection/connectionManager";
import { CHAT_PANEL_ID } from "../../../../utils/constants/constants";
import { mostRelevantCellsForQuery } from "../../../../utils/embeddings";
import { formatCellOutputs } from "../../../../utils/magic/messages";
import { makeStreamingRequest } from "../../../../utils/streaming";
import { useSettingsStore } from "../../../modals/server-settings/SettingsStore";
import { useNotebookStore } from "../../../notebook/store/NotebookStore";
import { useSidebarStore } from "../../store/SidebarStore";
export type UserType = "assistant" | "user";

export interface ChatMessage {
	id: string;
	contexts: string[];
	text: string;
	user: UserType;
	timestamp: Date;
}

export interface ChatStore {
	messages: ChatMessage[];
	currentChatContext: string[];
	isChatLive: boolean;
	addMessage: any;
	abortController: AbortController;
	isResponding: boolean;

	setIsResponding: (isResponding: boolean) => void;
	setIsChatLive: (isChatLive: boolean) => void;
	addChatContext: (text: string) => void;
	removeChatContext: (index: number) => void;
	askChatAssistant: (query: string) => Promise<void>;
	setMessages: (messages: ChatMessage[]) => void;
	endChat: () => void;
	updateMessage: any;
}

export const useChatStore = create<ChatStore>((set, get) => ({
	abortController: new AbortController(),
	messages: [],
	currentChatContext: [],
	isChatLive: false,
	isResponding: false,

	setIsResponding: (isResponding: boolean) => set({ isResponding }),
	setIsChatLive: (isChatLive: boolean) =>
		set((state) => ({ ...state, isChatLive })),
	addMessage: (text: string, user: UserType = "user", id?: string) => {
		if (id) {
			set((state) => ({
				...state,
				messages: state.messages.map((message) =>
					message.id === id ? { ...message, text } : message,
				),
			}));

			return id;
		} else {
			// Takes the current chat context and adds it to the message, and clears the current chat context.
			const message: ChatMessage = {
				text,
				contexts: get().currentChatContext,
				user,
				timestamp: new Date(),
				id: uuidv4(),
			};

			set((state) => {
				return {
					...state,
					isChatLive: true,
					currentChatContext: [],
					messages: [...state.messages, message],
				};
			});

			return message.id;
		}
	},
	addChatContext: (text: string) => {
		set((state) => ({
			...state,
			currentChatContext: [...state.currentChatContext, text],
		}));
	},
	removeChatContext: (index: number) => {
		set((state) => ({
			...state,
			currentChatContext: state.currentChatContext.filter(
				(_, i) => i !== index,
			),
		}));
	},
	clearChatContext: () => {
		set((state) => ({
			...state,
			currentChatContext: [],
		}));
	},
	setMessages: (messages: ChatMessage[]) =>
		set((state) => {
			return {
				...state,
				messages,
			};
		}),
	updateMessage: (id: string, newText: string) => {
		get().addMessage(newText, "assistant", id);
	},
	askChatAssistant: async (query: string) => {
		// add the user message to the store
		const { messages, addMessage, updateMessage, currentChatContext } =
			get();

		let abortController = new AbortController();
		set({ abortController });
		// Expand the sidebar and select the chat to answer the question
		useSidebarStore.getState().setIsExpanded(true);
		useSidebarStore.getState().setPanelType(CHAT_PANEL_ID);

		addMessage(query, "user");

		const shouldContinue = useApiCallStore
			.getState()
			.checkAndIncrementApiCallCount();

		if (!shouldContinue) {
			return;
		}

		const { activeCellIndex, cells } = useNotebookStore.getState();
		const activeCellSource = cells[activeCellIndex]?.source as string;
		const currentChatNamespace =
			ConnectionManager.getInstance().currentNamespace;
		set({ isResponding: true });
		// send message to the chat assistant
		try {
			const mostRelevantCells = await mostRelevantCellsForQuery(query);
			// truncate cell outputs to prevent whole payloads being sent (e.g. Plotly)
			const mostRelevantCellsWithFormattedOutputs = mostRelevantCells.map(
				(cell) => {
					return {
						...cell,
						outputs: formatCellOutputs(cell),
					};
				},
			);

			const { getServerProxyUrl } = useSettingsStore.getState();

			let assistantMessageId;
			const stream = makeStreamingRequest({
				url: `${getServerProxyUrl()}/api/chat/assistant`,
				method: "POST",
				payload: {
					query,
					previousMessages: messages,
					currentChatContext,
					currentChatNamespace,
					activeCellSource,
					mostRelevantContextualCellsForQuery:
						mostRelevantCellsWithFormattedOutputs,
					uniqueId: ConnectionManager.getInstance().uniqueId,
				},
				shouldCancel: () => {
					const aborted = abortController.signal.aborted;
					console.log("aborted: ", aborted);
					return aborted;
				},
			});

			let errorCount = 0;
			for await (const chunk of stream) {
				console.log(chunk);
				if (chunk) {
					try {
						if (!assistantMessageId) {
							assistantMessageId = addMessage(chunk, "assistant");
						} else {
							updateMessage(assistantMessageId, chunk);
						}
					} catch (e) {
						console.error("Error adding message: ", e);
						errorCount += 1;
						if (errorCount >= 3) {
							abortController.abort();
							break;
						}
					}
				}
			}
		} catch (error: any) {
			set({ isResponding: false });
			if (error.name === "AbortError") {
				console.log("Fetch aborted");
			} else {
				console.error("An unexpected error occurred:", error);
			}
		} finally {
			set({ isResponding: false });
		}
	},
	endChat: () => {
		set((state) => ({
			...state,
			messages: [],
			currentChatContext: [],
			isChatLive: false,
		}));
	},
}));
