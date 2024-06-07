import { ThreadCell } from "./code.types";

export interface ThreadFile extends File {
	type: string;
	name: string;
	last_modified: string;
	path: string;
	size: number;
	slice: (start: number, end: number) => Blob;
	mimetype: string;
	content: any;
}

export type NotebookMetadata = {
	thread: {
		id: string;
		sessionId?: string;
		kernelId?: string;
	};
} & Record<string, any>;

export type NotebookFile = {
	cells: ThreadCell[];
	metadata: NotebookMetadata;
	nbformat: number;
	nbformat_minor: number;
};
