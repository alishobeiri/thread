import { captureException } from "@sentry/nextjs";
import { useNotebookStore } from "../../components/notebook/store/NotebookStore";
import ConnectionManager from "../../services/connection/connectionManager";
import { ThreadFile } from "../../types/file.types";

export function refresh(path: string) {
	return getPathContents(path);
}

function getPathContents(path: string): Promise<ThreadFile[]> {
	return ConnectionManager.getInstance().ready.then(() =>
		ConnectionManager.getInstance()
			.serviceManager!.contents.get(path)
			.then((contents) => {
				if (!contents || !contents.content) {
					return [] as ThreadFile[];
				}
				return contents.content as ThreadFile[];
			})
			.catch((e) => {
				if (e && e.response && e.response.status != 404) {
					captureException(e);
					console.error(e);
				}

				// if there's an error, return the existing files. this prevents the files from disappearing
				const { files } = useNotebookStore.getState();
				return files as ThreadFile[];
			}),
	);
}
