import { Box, HStack, VStack, useColorModeValue } from "@chakra-ui/react";
import { markdown } from "@codemirror/lang-markdown";
import { hyperLink } from "@uiw/codemirror-extensions-hyper-link";
import CodeMirror, { ReactCodeMirrorRef, keymap } from "@uiw/react-codemirror";
import "katex/dist/katex.min.css";
import React, { useEffect, useMemo, useRef, useState } from "react";
import Markdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import {
	CELL_ACTIVE_COLOR,
	CELL_MINIMUM_HEIGHT,
} from "../../utils/constants/constants";
import { getCustomMarkdownComponents } from "../../utils/markdown";
import {
	getThreadCellMetadata,
	multilineStringToString,
} from "../../utils/utils";
import {
	MarkdownCell as MarkdownCellType,
	useNotebookStore,
} from "../notebook/store/NotebookStore";
import { jupyterLabKeymap } from "./input/keymap";
import { jupyterTheme } from "./input/theme";

import { useRouter } from "next/router";
import rehypeKatex from "rehype-katex";
import CellPadding from "./CellPadding";
import InputAreaToolbar from "./input/InputAreaToolbar";

interface CellContainerProps {
	active: boolean;
	cell: MarkdownCellType;
	index: number;
	isBeingEdited: boolean;
}

interface MarkdownCellProps {
	cell: MarkdownCellType;
	index: number;
	active: boolean;
	isBeingEdited: boolean;
}

const MarkdownCell = ({
	cell,
	index,
	active,
	isBeingEdited,
}: MarkdownCellProps) => {
	const [hovered, setIsHovering] = useState(false);
	const router = useRouter();
	const cellId = cell.id as string;
	const { metadata, source: rawSource } = cell;
	const rendered = metadata.rendered;
	const source = multilineStringToString(rawSource);
	const cellRef = useRef<HTMLDivElement>(null);
	const cmRef = useRef<ReactCodeMirrorRef>(null);
	const defaultBorderColor = useColorModeValue(
		"var(--jp-border-color2)",
		"var(--jp-border-color0)",
	);

	const onChange = (updatedCode: string) => {
		const { setCellSource } = useNotebookStore.getState();
		setCellSource(cellId, updatedCode);
	};

	useEffect(() => {
		const { setMarkdownCellRendered } = useNotebookStore.getState();
		if (rendered === true && isBeingEdited) {
			setMarkdownCellRendered(cellId, false);
		} else if (!isBeingEdited) {
			setMarkdownCellRendered(cellId, true);
		}
	}, [active, rendered, isBeingEdited]);

	const extensions = [
		markdown(),
		hyperLink,
		jupyterTheme,
		keymap.of(jupyterLabKeymap),
	];

	const customComponents = useMemo(() => {
		return getCustomMarkdownComponents({
			showCodeBlockActions: false,
			router,
		});
	}, []);

	return (
		<Box
			ref={cellRef}
			minHeight={`${CELL_MINIMUM_HEIGHT}px`}
			flex="1"
			overflow="auto"
			tabIndex={1}
			border={
				rendered
					? isBeingEdited
						? `3px solid ${defaultBorderColor}`
						: source && source.length > 0
						? "3px solid transparent"
						: "3px dashed var(--jp-layout-color1)"
					: isBeingEdited
					? `3px solid ${CELL_ACTIVE_COLOR}`
					: `3px solid ${defaultBorderColor}`
			}
			width={"100%"}
			onClick={() => {}}
		>
			{rendered ? (
				<Box
					border={
						active
							? "1px dashed var(--jp-border-color2)"
							: hovered
							? "1px dashed var(--jp-border-color2)"
							: "1px dashed transparent"
					}
					height={"100%"}
					cursor={hovered ? "pointer" : undefined}
					onMouseEnter={() => setIsHovering(true)}
					onMouseLeave={() => setIsHovering(false)}
					px={2.5}
					py={1}
				>
					<Markdown
						remarkPlugins={[remarkGfm, remarkBreaks, remarkMath]}
						rehypePlugins={[rehypeRaw, rehypeKatex]}
						components={customComponents as any}
					>
						{`${source as string}`}
					</Markdown>
				</Box>
			) : (
				<HStack
					width="100%"
					overflow="auto"
					gap={0}
					tabIndex={0}
					alignItems={"flex-start"}
					height="100%"
					backgroundColor={"var(--jp-layout-color1)"}
				>
					<CodeMirror
						ref={cmRef}
						className="cell-editor"
						style={{
							fontFamily: "monospace",
							overflow: "auto",
							width: "100%",
						}}
						autoFocus
						value={source as string}
						extensions={extensions}
						onChange={(updatedCode) => {
							onChange(updatedCode);
						}}
						basicSetup={{
							lineNumbers: false,
							tabSize: 4,
							foldGutter: false,
							highlightActiveLineGutter: true,
							highlightActiveLine: false,
						}}
					/>
					<InputAreaToolbar
						id={cellId}
						active={active}
						source={source}
						index={index}
						cmRef={cmRef}
						type={"markdown"}
					/>
				</HStack>
			)}
		</Box>
	);
};

const MarkdownCellContainer: React.FC<CellContainerProps> = ({
	active,
	cell,
	index,
	isBeingEdited,
}) => {
	const threadMetadata = getThreadCellMetadata(cell);
	const isUserMessage = threadMetadata?.user === "user";

	return (
		<VStack
			width="100%"
			gap={2}
			height="100%"
			pb={0}
			m={0}
			className={active ? "active-cell" : "markdown-cell"}
		>
			<HStack
				width="100%"
				gap={!isUserMessage ? 0 : 2}
				overflow="auto"
				borderLeft={
					active
						? `3px solid ${CELL_ACTIVE_COLOR}`
						: "3px solid transparent"
				}
				position="relative"
				onClick={() => {
					const { setActiveCell, setNotebookMode } =
						useNotebookStore.getState();
					setActiveCell(cell.id as string);
					setNotebookMode("edit");
				}}
				justifyContent={"center"}
				alignItems={"stretch"}
			>
				<CellPadding extraAdjustment={true} />
				<MarkdownCell
					cell={cell}
					index={index}
					active={active}
					isBeingEdited={isBeingEdited}
				/>
			</HStack>
		</VStack>
	);
};

export default MarkdownCellContainer;
