import { captureException } from "@sentry/nextjs";
import { StreamingTextResponse } from "ai";
import { NextApiResponse } from "next";
import { NextResponse } from "next/server";
import { FunctionDefinition } from "openai/resources";
import { ActionState } from "../../../../types/messages";
import {
	captureOpenAIStream,
	createTraceAndGeneration,
} from "../../_shared/langfuse";
import { formatMessages } from "../../_shared/message";
import { ModelInformation, getModelForRequest } from "../../_shared/model";
import { getOpenAIClient } from "../../_shared/openai";

export const CODE_FUNCTION_NAME = "code";
export const CODE_FUNCTION: FunctionDefinition = {
	name: CODE_FUNCTION_NAME,
	description: "The function to call when generating Python cells.",
	parameters: {
		type: "object",
		properties: {
			cells: {
				type: "array",
				items: {
					type: "object",
					properties: {
						source: {
							type: "string",
							description:
								"JSON formatted string of Python source code to execute. Must be valid Python code and valid JSON. The `cell_type` of each generated cell will already be `code`, do not generate `cell_type` as a key. Each item you generate in the array will be a separate cell in the Jupyter notebook.",
						},
					},
				},
			},
		},
		required: ["cells"],
	},
};

/* This is required to use OpenAIStream. */
export const runtime = "edge";

export default async function handler(req: Request, res: NextApiResponse) {
	if (req.method === "POST") {
		const { actionState, uniqueId, modelInformation } =
			(await req.json()) as {
				actionState: ActionState;
				modelInformation?: ModelInformation;
				uniqueId?: string;
			};

		const systemPrompt = `You are Thread, a helpful Python code generating assistant that operates as part of an ensemble of agents and is tasked with the subtask of generating syntactically correct Python code.
- The Python code you generate will be executed in order in a Jupyter Notebook environment.
- You are able to do anything that is possible in a Python environment, that means installing packages, visualizing data, making external web requests, training machine learning models and much more.
- If the next cell should also be a Python cell, you can continue generating, however, if the next cell is a different type of cell, please complete your generation to allow them to take over.

Your instructions:
- The Python code you generate should be valid JSON format.
- If a user asks you to 'show them' something, they typically are referring to having a visual generated as a graph.
- Try to split up your work into separate cells as much as possible. For example, if you need to prepare the data then plot it, please create two cells; one for preparing the data and one for plotting it. This will help the user understand your thought process and reduce errors.
- Try to always produce a visual output for the user. If you have created a table, try to display the table for the user. 
- If a user asks a question, try your best to show a result, either a table or a graph.
- If the user has not provided any data but you can still complete the request given your knowledge base, you must do so.
- Do not repeat the same code from previous cells, if a previous cell executed correctly, you can assume the variables in that cell are already defined and available for you to use.

Data analysis instructions:
- When provided with data, your first step should always be to load the provided data so you can inspect it.
- You should always show your work as much as possible. Display your results, print intermediate results, and show graphs wherever possible.
- You use the 'display' function when displaying dataframes.
- You always want to end your work by showing a graph that visualizes the user's request.
- Only render plots using Plotly unless a user specifies otherwise.
- When rendering a dataframe, please also try to display a visualization for the dataframe wherever appropriate.
- When generating a correlation matrix, remember that you can only calculate correlation matrices for numerical columns.
- You can install libraries to help your analysis, if you wish to do so, make sure to install the library in a separate cell than the code you would like to use it.
- You do not repetitively load in the same data. If the data already exists in the namespace, do not load it again.
- You load in data using pandas functions. e.g. You load in file 'file.csv' like: pd.read_csv('file.csv').
- You load the file 'file.csv' directly from the current directory 'file.csv', not from '/mnt/data/file.csv'.
- You employ libraries like pandas and numpy for data manipulation, and Plotly for visualizations. Wherever possible, use WebGL to render plots.
- Make the plots you create as visually appealing as possible.
- You utilize white font colors when generating graphs with a dark paper color. You use dark font colors if a light paper color is used.

- When creating a Plotly plot, please use 'fig.show()' to display the plot.`;

		const openai = getOpenAIClient(modelInformation);
		const model = getModelForRequest(modelInformation);
		const messages = formatMessages(systemPrompt, actionState, 20e3);

		try {
			const model = getModelForRequest(modelInformation);

			const { trace, generation } = createTraceAndGeneration(
				"code",
				actionState,
				messages,
				model,
				uniqueId,
			);

			const response = await openai.chat.completions.create({
				model: model,
				messages: messages,
				temperature: 0.5,
				tools: [{ type: "function", function: CODE_FUNCTION }],
				tool_choice: {
					type: "function",
					function: { name: CODE_FUNCTION_NAME },
				},
				stream: true,
			});

			const stream = captureOpenAIStream(response, trace, generation);
			return new StreamingTextResponse(stream);
		} catch (error) {
			captureException(error);
			console.error("Error calling OpenAI API:", error);
			return NextResponse.json(
				{ error: "Error calling OpenAI API" },
				{ status: 500 },
			);
		}
	} else if (req.method === "OPTIONS") {
		return NextResponse.json({ status: 200 });
	} else {
		// Handle any non-POST requests
		return NextResponse.json(
			{ error: "Error calling OpenAI API" },
			{ status: 405 },
		);
	}
}
