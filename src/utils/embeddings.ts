import { ICell } from "@jupyterlab/nbformat";
import { PartialJSONArray, PartialJSONObject } from "@lumino/coreutils/types";
import { useNotebookStore } from "../components/notebook/store/NotebookStore";
import TextEmbeddingModel from "../services/embedding/TextEmbedder";
import { CONTEXT_WINDOW_SIZE } from "./constants/constants";

export const getCellEmbedding = (cell: ICell) => {
	if (
		cell.metadata &&
		cell.metadata["vizlyNotebook"] &&
		(cell.metadata["vizlyNotebook"] as PartialJSONObject)["embedding"]
	) {
		return (cell.metadata["vizlyNotebook"] as PartialJSONObject)[
			"embedding"
		] as PartialJSONArray;
	}
	return undefined;
};

export const mostRelevantCellsForQuery = async (
	query: string,
	k = CONTEXT_WINDOW_SIZE,
) => {
	try {
		const { cells } = useNotebookStore.getState();
		// Get the cell embeddings and filter out the active cell
		const embeddings = cells
			.map(getCellEmbedding)
			.filter((_, i) => i != useNotebookStore.getState().activeCellIndex);

		const textEmbedder = TextEmbeddingModel.getInstance();
		const queryEmbed = textEmbedder.embed(query);
		if (!queryEmbed) {
			return [];
		}

		const mostRelevantCells = embeddings
			.map((embedding, i) => {
				return {
					similarity: embedding
						? TextEmbeddingModel.getInstance().similarity(
								queryEmbed,
								embedding as any,
						  )
						: -1,
					index: i,
				};
			})
			.sort((a, b) => b.similarity - a.similarity)
			.map((item) => cells[item.index])
			.slice(0, k);
		return mostRelevantCells;
	} catch (e) {
		return [];
	}
};
