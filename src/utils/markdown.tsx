import { AddIcon, CheckIcon, CopyIcon } from "@chakra-ui/icons";
import {
	Box,
	Button,
	Code,
	Divider,
	HStack,
	Heading,
	Image,
	Link,
	ListItem,
	OrderedList,
	Table,
	TableCaption,
	Tbody,
	Td,
	Tfoot,
	Th,
	Thead,
	Tooltip,
	Tr,
	UnorderedList,
} from "@chakra-ui/react";
import { ReactNode, useState } from "react";

import { NextRouter } from "next/router";
import { CheckmarkIcon } from "../assets/icons";
import { useNotebookStore } from "../components/notebook/store/NotebookStore";
import { BasicCodeMirrorEditor } from "./codemirror";

interface MarkdownComponentProps {
	children?: ReactNode;
	className?: string;
	node?: ReactNode;
	href?: string;
	title?: string;
}

interface HeadingProps extends MarkdownComponentProps {
	level: number; // specific to headings
}

interface CodeComponentProps extends MarkdownComponentProps {
	showCodeBlockActions: boolean;
}

const CodeComponent = (props: CodeComponentProps) => {
	const { children, className, node, showCodeBlockActions, ...rest } = props;
	const match = /language-(\w+)/.exec(className || "");
	const code = String(children).replace(/\n$/, "");

	const [copyButtonText, setCopyButtonText] = useState("Copy code");
	const [copyButtonIcon, setCopyButtonIcon] = useState(
		<CopyIcon boxSize="8px" />,
	);
	const [cellButtonIcon, setCellButtonIcon] = useState(
		<AddIcon boxSize="8px" />,
	);
	const [addCellButtonText, setAddCellButtonText] = useState("Add cell");

	return match ? (
		<Box
			sx={{
				".cm-editor": {
					backgroundColor: "gray.50",
				},
				".cm-content": {
					caretColor: "transparent",
				},
			}}
		>
			{showCodeBlockActions && (
				<HStack
					width="100%"
					justifyContent={"space-between"}
					backgroundColor={"var(--jp-layout-color2)"}
				>
					<Tooltip label={copyButtonText} placement="top">
						<Button
							size="sm"
							borderRadius={0}
							fontFamily="body"
							fontSize="small"
							variant={"ghost"}
							leftIcon={copyButtonIcon}
							onClick={() => {
								navigator.clipboard.writeText(code);
								setCopyButtonText("Code Copied");
								setCopyButtonIcon(
									<CheckmarkIcon boxSize="8px" />,
								);
								setTimeout(() => {
									setCopyButtonText("Copy code");
									setCopyButtonIcon(
										<CopyIcon boxSize="8px" />,
									);
								}, 3000);
							}}
						>
							{copyButtonText}
						</Button>
					</Tooltip>
					<Tooltip label={"Add cell"} placement="top">
						<Button
							size="sm"
							borderRadius={0}
							fontFamily="body"
							fontSize="small"
							variant={"ghost"}
							color="orange.200"
							leftIcon={cellButtonIcon}
							onClick={() => {
								const { addCellAtIndex, activeCellIndex } =
									useNotebookStore.getState();
								addCellAtIndex(activeCellIndex + 1, code);
								setCellButtonIcon(<CheckIcon boxSize="8px" />);
								setAddCellButtonText("Cell Added");
								setTimeout(() => {
									setCellButtonIcon(
										<AddIcon boxSize="8px" />,
									);
									setAddCellButtonText("Add cell");
								}, 3000);
							}}
						>
							{addCellButtonText}
						</Button>
					</Tooltip>
				</HStack>
			)}
			<BasicCodeMirrorEditor code={code} />
		</Box>
	) : (
		<code
			{...rest}
			style={{
				whiteSpace: "pre-wrap",
				display: "inline",
				padding: "0.1em 0.0em",
				backgroundColor: "var(--jp-layout-color2)",
				color: "var(--chakra-colors-red-400)",
				fontWeight: "500",
				fontFamily: "Space Grotesk",
				borderRadius: "4px",
			}}
			className={className}
		>
			{children}
		</code>
	);
};

export const getCustomMarkdownComponents = ({
	showCodeBlockActions = false,
	router,
}: {
	showCodeBlockActions?: boolean;
	router?: NextRouter;
} = {}) => {
	return {
		h1: (props: HeadingProps) => (
			<Heading as="h1" size="xl" my="2" {...props} />
		),
		h2: (props: HeadingProps) => (
			<Heading as="h2" size="lg" my="2" {...props} />
		),
		h3: (props: HeadingProps) => (
			<Heading as="h3" size="md" my="1.5" {...props} />
		),
		h4: (props: HeadingProps) => (
			<Heading as="h4" size="sm" mt="0" mb="2" {...props} />
		),
		h5: (props: HeadingProps) => (
			<Heading as="h5" size="xs" my="1" {...props} />
		),
		h6: (props: HeadingProps) => (
			<Heading as="h6" size="xs" my="1" {...props} />
		),
		p: ({ node, ...props }: MarkdownComponentProps) => <div {...props} />,

		a: ({ node, ...props }: MarkdownComponentProps) => {
			// Default link rendering
			return (
				<Link
					onClick={() => window.open(props.href, "_blank")}
					as="a"
					target="_blank"
					color="blue.500"
					{...props}
				/>
			);
		},

		img: (props: MarkdownComponentProps) => <Image {...props} />,

		inlineCode: (props: MarkdownComponentProps) => (
			<Code p="6px 8px" {...props} />
		),

		code: (props: MarkdownComponentProps) => {
			return (
				<CodeComponent
					{...props}
					showCodeBlockActions={showCodeBlockActions}
				/>
			);
		},

		// Horizontal Rule / Divider
		hr: (props: MarkdownComponentProps) => <Divider my="4" {...props} />,

		// Lists
		ul: ({ node, ...props }: MarkdownComponentProps) => (
			<UnorderedList {...props} />
		),
		ol: ({ node, ...props }: MarkdownComponentProps) => (
			<OrderedList pl="4" {...props} />
		),
		li: ({ node, ...props }: MarkdownComponentProps) => (
			<ListItem py="1" {...props} />
		),

		// Tables
		table: (props: MarkdownComponentProps) => (
			<Table variant="simple" {...props} />
		),
		thead: (props: MarkdownComponentProps) => <Thead {...props} />,
		tbody: (props: MarkdownComponentProps) => <Tbody {...props} />,
		tfoot: (props: MarkdownComponentProps) => <Tfoot {...props} />,
		tr: (props: MarkdownComponentProps) => <Tr {...props} />,
		th: (props: MarkdownComponentProps) => <Th {...props} />,
		td: (props: MarkdownComponentProps) => <Td {...props} />,
		tableCaption: (props: MarkdownComponentProps) => (
			<TableCaption {...props} />
		),
	};
};
