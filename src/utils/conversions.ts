import { ICell } from "@jupyterlab/nbformat";
import { NotebookFile } from "../types/file.types";

export const normalizeCell = (cell: ICell): ICell => {
	if (cell.cell_type === "markdown") {
		const { execution_count, outputs, ...rest } = cell;
		return rest;
	}
	return cell;
};

export const getReadableDate = (dateString: string) => {
	const date = new Date(dateString);

	const options = {
		year: "numeric",
		month: "long",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		hour12: true,
	};

	const formattedDate = date.toLocaleString("en-US", options as any);
	return formattedDate;
};

export const getDaysAgo = (dateString: string) => {
	const lastModifiedDate = new Date(dateString);
	const currentDate = new Date();

	const differenceInTime = currentDate.getTime() - lastModifiedDate.getTime();
	const differenceInSeconds = Math.floor(differenceInTime / 1000);
	const differenceInMinutes = Math.floor(differenceInSeconds / 60);
	const differenceInHours = Math.floor(differenceInMinutes / 60);
	const differenceInDays = Math.floor(differenceInHours / 24);
	const differenceInWeeks = Math.floor(differenceInDays / 7);
	const differenceInMonths = Math.floor(differenceInDays / 30); // Approximation

	if (differenceInMonths >= 1) {
		// More than a month
		return (
			differenceInMonths +
			(differenceInMonths === 1 ? " month ago" : " months ago")
		);
	} else if (differenceInWeeks >= 1) {
		// More than a week but less than a month
		return (
			differenceInWeeks +
			(differenceInWeeks === 1 ? " week ago" : " weeks ago")
		);
	} else if (differenceInDays >= 1) {
		// More than a day but less than a week
		return (
			differenceInDays +
			(differenceInDays === 1 ? " day ago" : " days ago")
		);
	} else if (differenceInHours >= 1) {
		// More than an hour but less than a day
		return (
			differenceInHours +
			(differenceInHours === 1 ? " hour ago" : " hours ago")
		);
	} else if (differenceInMinutes >= 1) {
		// More than a minute but less than an hour
		return (
			differenceInMinutes +
			(differenceInMinutes === 1 ? " minute ago" : " minutes ago")
		);
	} else if (differenceInSeconds >= 1) {
		// More than a second but less than a minute
		return (
			differenceInSeconds +
			(differenceInSeconds === 1 ? " second ago" : " seconds ago")
		);
	} else {
		// Less than a second
		return "Just now";
	}
};

export const formatFileSizes = (bytes: number) => {
	const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
	if (bytes === 0) return "0 Byte";

	const i = Math.floor(Math.log(bytes) / Math.log(1024));
	if (i === 0) return bytes + " " + sizes[i];

	return (bytes / Math.pow(1024, i)).toFixed(2) + " " + sizes[i];
};

export const parseNotebookBlob = (
	blob: Blob,
): Promise<NotebookFile | undefined> => {
	return blob.arrayBuffer().then((text) => {
		const uintArray = new Uint8Array(text);
		return JSON.parse(
			new TextDecoder("utf-8").decode(uintArray),
		) as NotebookFile;
	});
};

export const readFileToContents = async (
	file: File,
): Promise<NotebookFile | undefined> => {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();

		reader.onload = async (e: ProgressEvent<FileReader>) => {
			if (!e.target) {
				reject();
				return;
			}
			let content = e.target.result as string;
			try {
				content = JSON.parse(content);
				resolve(content as any as NotebookFile);
			} catch {
				reject();
			}
		};

		reader.onerror = () => {
			console.error("Error reading file");
			reader.abort();
			reject();
		};

		reader.readAsText(file); // or use readAsArrayBuffer, readAsDataURL, etc., based on your requirement
	});
};
