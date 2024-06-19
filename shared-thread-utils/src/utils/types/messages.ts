export interface UserSettings {
	context: string;
	responseStyle: string;
	primaryColor: string;
	secondaryColor: string;
}

// Keeps track of all the action states that
export type ActionState = {
	userRequest: string;
	prevMessages: NoterousMessage[];
	messagesAfterQuery: NoterousMessage[];
	firstQuery: boolean;

	// The index where cell generation has begun
	initialCellGenerationIndex: number;

	// Where we are in the index of cells being generated
	currentCellGenerationIndex: number;
	currentNamespace: string;

	// The cell grouping for the magic query
	group: string;
	theme: "light" | "dark";

	// List of actions in the order that they occurred
	prevActions: any[];
};

export type NoterousMessage = {
	role: "system" | "user" | "assistant";
	content: string;
};

export type UserType = "assistant" | "user";

export interface ChatMessage {
	id: string;
	contexts: string[];
	text: string;
	user: UserType;
	timestamp: Date;
}
