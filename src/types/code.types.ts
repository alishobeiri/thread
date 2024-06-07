import { ICell } from "@jupyterlab/nbformat";

export type CodeLine = {
	c: string;
	l: number;
};

export type ThreadCell = ICell & {
	metadata: {
		thread?: Record<string, any>;
	};
};
