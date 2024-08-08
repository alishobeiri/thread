import { ICell } from "@jupyterlab/nbformat";

export type CodeLine = {
	c: string;
	l: number;
};

export type VizlyNotebookCell = ICell & {
	metadata: {
		vizlyNotebook?: Record<string, any>;
	};
};
