jest.mock("../../components/notebook/store/NotebookStore", () => ({
	useNotebookStore: jest.fn(() => ({
		cells: [],
	})),
}));

import { VizlyNotebookCell } from "../../types/code.types";
import {
	MAX_OUTPUT_LENGTH,
	MESSAGES_LOOKBACK_WINDOW,
} from "../constants/constants";
import { formatCellsAsMessages } from "./messages";

const notebooks = require("../../../__tests__/__mocks__/notebooks.json");

describe("should parse outputs correctly", () => {
	it("output under limit should be captured correctly", () => {
		const mockCells = notebooks.loadDataframe.cells as VizlyNotebookCell[];
		const messages = formatCellsAsMessages(
			mockCells,
			MESSAGES_LOOKBACK_WINDOW,
			true,
		);

		expect(messages[0].role).toBe("user");
		expect(messages[1].role).toBe("assistant");
		expect(messages[2].role).toBe("assistant");
		expect(messages.length).toEqual(3);
		expect(JSON.parse(messages[2].content).outputs.length).toEqual(1596);
	});

	it("output over limit should be truncated correctly", () => {
		const mockCells = notebooks.largeOutputStream
			.cells as VizlyNotebookCell[];
		const messages = formatCellsAsMessages(
			mockCells,
			MESSAGES_LOOKBACK_WINDOW,
			true,
		);

		expect(messages[0].role).toBe("user");
		expect(messages[1].role).toBe("assistant");
		expect(messages[2].role).toBe("assistant");
		expect(messages.length).toEqual(3);
		expect(
			JSON.parse(messages[2].content).outputs.length,
		).toBeLessThanOrEqual(MAX_OUTPUT_LENGTH);
	});

	it("should limit successive outputs correctly", () => {
		const mockCells = notebooks.manyTables.cells as VizlyNotebookCell[];
		const messages = formatCellsAsMessages(
			mockCells,
			MESSAGES_LOOKBACK_WINDOW,
			true,
		);

		expect(messages[0].role).toBe("user");
		expect(messages[1].role).toBe("assistant");
		expect(messages[2].role).toBe("assistant");
		expect(messages[3].role).toBe("assistant");
		expect(messages[4].role).toBe("user");
		expect(messages[5].role).toBe("assistant");
		expect(messages[6].role).toBe("assistant");
		expect(messages.length).toEqual(8);
		expect(
			JSON.parse(messages[6].content).outputs.length,
		).toBeLessThanOrEqual(MAX_OUTPUT_LENGTH);
	});

	it("should limit successive outputs and error correctly", () => {
		const mockCells = notebooks.mixedTableErrorOutput
			.cells as VizlyNotebookCell[];
		const messages = formatCellsAsMessages(
			mockCells,
			MESSAGES_LOOKBACK_WINDOW,
			true,
		);

		expect(messages[0].role).toBe("user");
		expect(messages[1].role).toBe("assistant");
		expect(messages[2].role).toBe("assistant");
		expect(messages.length).toEqual(3);

		expect(messages[2].content).toContain("ValueError: Deliberate Error");
		expect(messages[2].content).toContain("10         raise ValueError(");
		expect(JSON.parse(messages[2].content).error_occurred).toBe(true);
	});

	it("should filter out successive error cells if the last one is not an error", () => {
		const mockCells = notebooks.errorFiltering.cells as VizlyNotebookCell[];

		expect(mockCells.length).toBe(6);
		const messages = formatCellsAsMessages(
			mockCells,
			MESSAGES_LOOKBACK_WINDOW,
			true,
		);

		expect(messages[0].role).toBe("user");
		expect(messages[1].role).toBe("assistant");
		expect(messages[2].role).toBe("assistant");
		expect(messages[3].role).toBe("assistant");
		expect(messages.length).toEqual(5);
	});

	it("should parse errors correctly", () => {
		const mockCells = notebooks.errorParsing.cells as VizlyNotebookCell[];
		const messages = formatCellsAsMessages(
			mockCells,
			// Fetch all the errors
			Number.MAX_SAFE_INTEGER,
			true,
		);

		// Check that all other indices except index 0 are of type `assistant`
		for (let i = 1; i < messages.length; i++) {
			expect(messages[i].role).toBe("assistant");
		}
		expect(messages[2].content).toContain("KeyError: 'Names'");
		expect(messages[2].content).toContain("7 display(df['Names'])");
		expect(messages[4].content).toContain(
			"TypeError: Could not convert string 'abc' to numeric",
		);
		expect(messages[4].content).toContain(
			"7 mean_value = data['B'].mean()",
		);
		expect(messages[6].content).toContain(
			"AttributeError: module 'matplotlib.pyplot' has no attribute 'polt'",
		);
		expect(messages[6].content).toContain(
			"4 plt.polt([1, 2, 3], [4, 5, 6])",
		);
		expect(messages[8].content).toContain(
			"KeyError: 'non_existing_column'",
		);
		expect(messages[8].content).toContain(
			"2 result = df['non_existing_column']",
		);
		expect(messages[10].content).toContain("ValueError: math domain error");
		expect(messages[10].content).toContain("4 result = math.sqrt(-1)");
		expect(messages[12].content).toContain(
			"NameError: name 'undefined_variable' is not defined",
		);
		expect(messages[12].content).toContain(
			"2 result = undefined_variable + 10",
		);
		expect(messages[14].content).toContain(
			"TypeError: sorted expected 1 argument, got 0",
		);
		expect(messages[14].content).toContain("2 result = sorted()");

		expect(messages[16].content).toContain(
			"TypeError: 'tuple' object does not support item assignment",
		);
		expect(messages[16].content).toContain("3 t[0] = 4");

		expect(messages[18].content).toContain(
			"SyntaxError: invalid syntax. Perhaps you forgot a comma?",
		);
		expect(messages[18].content).toContain(
			"result = json.loads('{'key': 'value'}')",
		);
		expect(messages[20].content).toContain(
			"AttributeError: 'DataFrame' object has no attribute 'non_existing_method'",
		);
		expect(messages[20].content).toContain(
			"2 result = df.non_existing_method()",
		);
		expect(messages[22].content).toContain(
			"IndexError: list index out of range",
		);
		expect(messages[22].content).toContain("3 result = my_list[5]");
	});

	it("should say graph was displayed correctly", () => {
		const mockCells = notebooks.plotlyGraphRendered
			.cells as VizlyNotebookCell[];
		const messages = formatCellsAsMessages(
			mockCells,
			// Fetch all the errors
			Number.MAX_SAFE_INTEGER,
			true,
		);
		expect(messages[1].content).toContain(
			"Graph / Image Displayed to User",
		);
	});
});
