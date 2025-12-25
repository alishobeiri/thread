import { ICell } from "@jupyterlab/nbformat";

export type CodeLine = {
	c: string;
	l: number;
};

export type ThreadNotebookCell = ICell & {
	metadata: {
		threadNotebook?: Record<string, any>;
	};
};
