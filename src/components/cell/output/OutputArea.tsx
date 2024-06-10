import "katex/dist/katex.min.css";
import { Flex, HStack, VStack, useBreakpointValue } from "@chakra-ui/react";
import { IDisplayData, IError, IOutput, IStream } from "@jupyterlab/nbformat";
import AnsiToHtml from "ansi-to-html";
import React, { useMemo, useRef } from "react";
import { useScrollToBottom } from "../../../hooks/useScroll";
import {
	CELL_GUTTER_WIDTH,
	OUTPUT_AREA_MAX_HEIGHT,
	SCROLL_CSS,
	SCROLL_TO_BOTTOM_THRESHOLD,
	START_HIDE_CURSOR,
	STOP_HIDE_CURSOR,
} from "../../../utils/constants/constants";
import { multilineStringToString } from "../../../utils/utils";
import { useNotebookStore } from "../../notebook/store/NotebookStore";
import { mimeRenderer } from "./mimeRenderer";
import ErrorRenderer from "./renderers/ErrorRenderer";

interface OutputAreaProps {
	index: number;
	cellId: string;
	outputs: IOutput[];
	className?: string;
}

const convert = new AnsiToHtml({ newline: true });

let cursor = {
	shouldShow: true,
	outputIndex: 0,
};
const streamPreProcessor = (streamOutput: IStream, i: number) => {
	const startHideCursor = streamOutput.text.includes(START_HIDE_CURSOR);
	const stopHideCursor = streamOutput.text.includes(STOP_HIDE_CURSOR);

	if (startHideCursor) {
		cursor = {
			shouldShow: false,
			outputIndex: i,
		};
	} else if (stopHideCursor) {
		cursor = {
			shouldShow: true,
			outputIndex: i + 1,
		};
	}
};

const streamPostProcessor = (streamOutput: IStream) => {
	return multilineStringToString(streamOutput.text)
		.replace(START_HIDE_CURSOR, "")
		.replace(STOP_HIDE_CURSOR, "");
};

const shouldHideOutput = (i: number, outputsLength: number) => {
	return (
		!cursor.shouldShow && cursor.outputIndex <= i && i != outputsLength - 1
	);
};

const OutputArea: React.FC<OutputAreaProps> = React.memo(
	({ index, cellId, outputs, className = "" }) => {
		const outputRef = useRef<HTMLDivElement>(null);
		const setActiveCell = useNotebookStore.getState().setActiveCell;
		const { handleScroll } = useScrollToBottom(
			outputRef,
			SCROLL_TO_BOTTOM_THRESHOLD,
		);

		const renderedOutputs = useMemo(
			() =>
				outputs.map((output: IOutput, i) => {
					let mimeKey: string;
					delete output["transient"];
					switch (output.output_type) {
						case "stream":
							const streamOutput = output as IStream;
							streamPreProcessor(streamOutput, i);
							if (shouldHideOutput(i, outputs.length)) {
								return null;
							}

							return (
								<pre
									style={{
										width: "100%",
										fontFamily: "monospace",
										whiteSpace: "pre-wrap",
									}}
									key={i}
									dangerouslySetInnerHTML={{
										__html: convert.toHtml(
											streamPostProcessor(streamOutput),
										),
									}}
								/>
							);
						case "display_data":
							const displayData = output as IDisplayData;
							mimeKey = Object.keys(displayData.data)
								.sort()
								.join(";");
							return mimeRenderer(
								i,
								cellId,
								mimeKey,
								displayData,
							);
						case "execute_result":
							const executeResult = output as IDisplayData;
							mimeKey = Object.keys(executeResult.data)
								.sort()
								.join(";");
							return mimeRenderer(
								i,
								cellId,
								mimeKey,
								executeResult,
							);
						case "error":
							const errorResult = output as IError;
							return (
								<ErrorRenderer
									cellId={cellId as string}
									containerRef={outputRef}
									key={i}
									index={index}
									traceback={errorResult.traceback}
									ename={errorResult.ename}
									evalue={errorResult.evalue}
								/>
							);
					}
				}),
			[cellId, outputs, index, outputRef],
		);

		return (
			<HStack
				width={"100%"}
				overflow="auto"
				justifyContent={"flex-start"}
				position="relative"
				gap={3}
				className={className}
				alignItems={"stretch"}
				fontSize={"var(--jp-code-font-size)"}
				onClick={() => setActiveCell(cellId)}
			>
				<Flex width={`${CELL_GUTTER_WIDTH}px`} />
				<VStack
					spacing={0}
					ref={outputRef}
					w={"100%"}
					flex={1}
					overflowX={"hidden"}
					maxHeight={`${OUTPUT_AREA_MAX_HEIGHT}px`}
					overflowY={"auto"}
					fontFamily={"monospace"}
					alignItems={"flex-start"}
					zIndex="6"
					sx={SCROLL_CSS}
					onScroll={handleScroll}
				>
					{renderedOutputs}
				</VStack>
			</HStack>
		);
	},
);

OutputArea.displayName = "OutputArea";
export default OutputArea;
