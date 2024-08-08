import { VizlyNotebookCell } from "./code.types";

export interface VizlyNotebookFile extends File {
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
	vizlyNotebook: {
		id: string;
		sessionId?: string;
		kernelId?: string;
	};
} & Record<string, any>;

export type NotebookFile = {
	cells: VizlyNotebookCell[];
	metadata: NotebookMetadata;
	nbformat: number;
	nbformat_minor: number;
};
