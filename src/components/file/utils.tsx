import Papa from "papaparse";
import { MAX_SPREADSHEET_SIZE_TO_PREVIEW } from "../../utils/constants/constants";
import { ExcelPreviewState, PreviewData, TransformData } from "./renderers";
import {
	APPLICATION_JSON,
	EXCEL_MIME_TYPE,
	SPREADHSEET_MIME_TYPE,
	TEXT_CSV,
} from "../cell/output/mimeTypes";

const PREVIEW_SIZE = 100;

export const getJSONPreview = (
	file: File,
	previewCount: number = 5,
): Promise<string> => {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();

		reader.onload = (e: ProgressEvent<FileReader>) => {
			try {
				const content = e.target?.result;
				const jsonData = JSON.parse(content as string);

				let previewData: any;

				if (Array.isArray(jsonData)) {
					// If it's an array, slice it to get the requested number of items
					previewData = jsonData.slice(0, previewCount);
				} else if (typeof jsonData === "object" && jsonData !== null) {
					// If it's an object, just use the object itself
					previewData = jsonData;
				} else {
					throw new Error(
						"JSON content is neither an object nor an array, or is empty",
					);
				}

				// Stringify the preview data with pretty print
				const resultString = JSON.stringify(previewData, null, 2);
				resolve(resultString);
			} catch (error) {
				reject(error);
			}
		};

		reader.onerror = () => reject(reader.error);
		reader.readAsText(file);
	});
};

export const getCSVPreview = (
	file: File,
): Promise<{ columns: string[]; rows: string[][] }> => {
	return new Promise((resolve, reject) => {
		let rows: string[][] = [];
		let columns: string[] = [];
		let isHeaderProcessed = false;

		Papa.parse(file, {
			worker: true,
			preview: PREVIEW_SIZE,
			step: function (result) {
				if (!isHeaderProcessed) {
					columns = result.data as any;
					isHeaderProcessed = true;
				} else {
					rows.push(result.data as string[]);
				}
			},
			complete: () => {
				resolve({ columns, rows });
			},
			error: (error) => reject(error),
		});
	});
};

type XLSXPreviewResult = {
	columns: string[];
	rows: string[][];
};

export const getXLSXPreview = (
	file: File,
): Promise<{ [sheetName: string]: XLSXPreviewResult }> => {
	return new Promise((resolve, reject) => {
		resolve({});
	});
};

export function transformRowsAndColumnsToData({
	columns,
	rows,
}: TransformData): Record<string, any>[] {
	return rows.map((row) => {
		const rowData: Record<string, any> = {};
		columns.forEach((column, index) => {
			rowData[column] = row[index];
		});
		return rowData;
	});
}

export const getFilePreview = async (file: File): Promise<PreviewData> => {
	if (file.type === TEXT_CSV) {
		const data = await getCSVPreview(file);

		return {
			type: file.type,
			data: {
				columns: data.columns,
				data: transformRowsAndColumnsToData({
					columns: data.columns,
					rows: data.rows,
				}),
			},
		};
	} else if (
		file.size < MAX_SPREADSHEET_SIZE_TO_PREVIEW &&
		(file.type == EXCEL_MIME_TYPE || file.type == SPREADHSEET_MIME_TYPE)
	) {
		const sheetsData = await getXLSXPreview(file);
		const transformedSheets: ExcelPreviewState = {};
		Object.entries(sheetsData).forEach(([sheetName, sheetData]) => {
			transformedSheets[sheetName] = {
				columns: sheetData.columns,
				data: transformRowsAndColumnsToData({
					columns: sheetData.columns,
					rows: sheetData.rows,
				}),
			};
		});
		return { type: file.type, data: transformedSheets };
	} else if (file.type === APPLICATION_JSON) {
		const data = await getJSONPreview(file);
		return { type: file.type, data };
	}

	return { type: file.type };
};
