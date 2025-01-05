import {
	ChatCompletionCreateParams,
	FunctionDefinition,
} from "openai/resources";
import { CodeLine } from "../../../types/code.types";

export const PYTHON_CODE_FUNCTION_NAME = "pFunc";
export const PYTHON_CODE_ARG = "lines";

export const codeDiffFunction: ChatCompletionCreateParams.Function[] = [
	{
		name: PYTHON_CODE_FUNCTION_NAME,
		description:
			"The function to call after generating Python code for the user request. The generated Python code should be an array of objects, each representing a line of code.",
		parameters: {
			type: "object",
			properties: {
				lines: {
					type: "array",
					items: {
						type: "object",
						properties: {
							t: {
								type: "string",
								enum: ["a", "d", "m"],
								description:
									"The type of diff change - a, d, or m. 'a' for addition, 'd' for deletion, 'm' for modification. Always return the entirety of the line, even for modifications.",
							},
							l: {
								type: "number",
								description:
									"The line number of the code in the original source code. Starting at 1.",
							},
							c: {
								type: "string",
								description:
									"The line of Python code to be placed at l.",
							},
						},
						required: ["c", "l", "t"],
					},
				},
			},
			required: [PYTHON_CODE_ARG],
		},
	},
];

export const PYTHON_CODE_FUNCTION: FunctionDefinition = {
	name: PYTHON_CODE_FUNCTION_NAME,
	description:
		"The function to call after generating Python code for the user request. The generated Python code should be an array of objects, each representing a line of code.",
	parameters: {
		type: "object",
		properties: {
			lines: {
				type: "array",
				items: {
					type: "object",
					properties: {
						c: {
							type: "string",
							description: "A line of Python code.",
						},
						l: {
							type: "number",
							description:
								"The line number of the code in the original source code. Starting at 1.",
						},
					},
					required: ["c", "l"],
				},
			},
		},
		required: [PYTHON_CODE_ARG],
	},
};

export const CELL_GENERATION_FUNCTION_NAME = "cG";
export const CELLS_ARG = "cells";
export const CELL_GENERATION_FUNCTION: FunctionDefinition = {
	name: CELL_GENERATION_FUNCTION_NAME,
	description:
		"The function to call when generating Jupyter Notebook cells for the user request. The generated Jupyter Notebook cells should be an array of objects, each representing a a cell in the notebook.",
	parameters: {
		type: "object",
		properties: {
			cells: {
				type: "array",
				items: {
					type: "object",
					properties: {
						cell_type: {
							type: "string",
							enum: ["markdown", "code"],
							description:
								"Type of the cell. Use 'markdown' for descriptions and 'code' for writing code.",
						},
						source: {
							type: "string",
							description:
								"JSON formatted string of the cell source. Can either be markdown or Python code.",
						},
					},
					required: ["cell_type", "source"],
				},
			},
		},
		required: [CELLS_ARG],
	},
};

export const FOLLOWUP_FUNCTION_NAME = "fU";
export const FOLLOWUP_FUNCTION: FunctionDefinition = {
	name: FOLLOWUP_FUNCTION_NAME,
	description:
		"The function to call when generating Jupyter notebook cells or deciding not to generate any more cells. moreRequired is a boolean indicating whether cells are required, i.e. whether the original user request has been completed.",
	parameters: {
		type: "object",
		properties: {
			cells: {
				type: "array",
				items: {
					type: "object",
					properties: {
						cell_type: {
							type: "string",
							enum: ["markdown", "code"],
							description:
								"Type of the cell. Use 'markdown' for descriptions and 'code' for writing code.",
						},
						source: {
							type: "string",
							description:
								"JSON formatted string of the cell source. Can either be markdown or Python code.",
						},
					},
					required: ["cell_type", "source"],
				},
			},
		},
		required: ["cells"],
	},
};

export const FIX_CELL_ERROR_FUNCTION_NAME = "cFix";
export const FIX_CELL_ERROR_FUNCTION: FunctionDefinition = {
	name: FIX_CELL_ERROR_FUNCTION_NAME,
	description:
		"The function to call when you have generated code to fix the user's error.",
	parameters: {
		type: "object",
		properties: {
			source: {
				type: "string",
				description:
					"JSON formatted string of the cell source. Should be Python code, should never be undefined.",
			},
		},
		required: ["source"],
	},
};

export const CELL_EDIT_FUNCTION_NAME = "editCode";
export const CELL_EDIT_FUNCTION: FunctionDefinition = {
	name: CELL_EDIT_FUNCTION_NAME,
	description:
		"The function to call after generating the edits required by the user.",
	parameters: {
		type: "object",
		properties: {
			source: {
				type: "string",
				description:
					"JSON formatted string of the cell source. Should be Python code, should never be undefined.",
			},
		},
		required: ["source"],
	},
};

export const linesToCode = (lines: CodeLine[]) =>
	lines.map((line) => line.c).join("\n");
