import { ICell } from "@jupyterlab/nbformat";
import { PartialJSONArray, PartialJSONObject } from "@lumino/coreutils/types";
import { useNotebookStore } from "../components/notebook/store/NotebookStore";
import TextEmbeddingModel from "../services/embedding/TextEmbedder";

export const getCellEmbedding = (cell: ICell) => {
	if (
		cell.metadata &&
		cell.metadata["thread"] &&
		(cell.metadata["thread"] as PartialJSONObject)["embedding"]
	) {
		return (cell.metadata["thread"] as PartialJSONObject)[
			"embedding"
		] as PartialJSONArray;
	}
	return undefined;
};

export const mostRelevantCellsForQuery = async (query: string, k = 5) => {
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
};
