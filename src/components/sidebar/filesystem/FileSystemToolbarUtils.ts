import ConnectionManager from "../../../services/connection/connectionManager";
import { VizlyNotebookFile } from "../../../types/file.types";
import { useNotebookStore } from "../../notebook/store/NotebookStore";

export function refresh(path: string) {
	return getPathContents(path);
}

function getPathContents(path: string): Promise<VizlyNotebookFile[]> {
	return ConnectionManager.getInstance().ready.then(() =>
		ConnectionManager.getInstance()
			.serviceManager!.contents.get(path)
			.then((contents) => {
				if (!contents || !contents.content) {
					return [] as VizlyNotebookFile[];
				}
				return contents.content as VizlyNotebookFile[];
			})
			.catch((e) => {
				if (e.response.status != 404) {
					console.error(e);
				}

				// if there's an error, return the existing files. this prevents the files from disappearing
				const { files } = useNotebookStore.getState();
				return files as VizlyNotebookFile[];
			}),
	);
}
