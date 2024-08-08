import {
	Embedding,
	FilesetResolver,
	TextEmbedder,
} from "@mediapipe/tasks-text";

export default class TextEmbeddingModel {
	private static instance: TextEmbeddingModel;
	private textEmbedder!: TextEmbedder;

	private constructor() {
		this.createEmbedder();
	}

	public static getInstance(): TextEmbeddingModel {
		if (!TextEmbeddingModel.instance) {
			TextEmbeddingModel.instance = new TextEmbeddingModel();
		}
		return TextEmbeddingModel.instance;
	}

	private async createEmbedder() {
		const textFiles = await FilesetResolver.forTextTasks(
			"./vizly-notebook/mediapipe/tasks-text/",
		);
		this.textEmbedder = await TextEmbedder.createFromOptions(textFiles, {
			baseOptions: {
				modelAssetPath: `https://storage.googleapis.com/mediapipe-tasks/text_embedder/universal_sentence_encoder.tflite`,
			},
			quantize: true,
		});
	}

	embed(code: string): Embedding | undefined {
		const embedding = this.textEmbedder.embed(code);
		return embedding.embeddings[0];
	}

	similarity(embedding1: Embedding, embedding2: Embedding): number {
		try {
			return TextEmbedder.cosineSimilarity(embedding1, embedding2);
		} catch (e) {
			return -1;
		}
	}
}
