import {
	ArrowDownIcon,
	ArrowUpIcon,
	CheckIcon,
	CopyIcon,
	DeleteIcon,
} from "@chakra-ui/icons";
import { HStack, IconButton, Tooltip } from "@chakra-ui/react";
import { captureException } from "@sentry/nextjs";
import React, { useState } from "react";
import {
	InsertCellAboveIcon,
	InsertCellBelowIcon,
	MarkdownIcon,
	PythonIcon,
} from "../../../assets/icons";
import {
	ICellTypes,
	useNotebookStore,
} from "../../notebook/store/NotebookStore";

interface InputAreaToolbarProps {
	active: boolean;
	source: boolean | string;
	index: number;
	cmRef: React.MutableRefObject<any>; // Add cmRef prop
	type: ICellTypes;
	id: string;
}

const InputAreaToolbar: React.FC<InputAreaToolbarProps> = ({
	active,
	source,
	index,
	cmRef,
	type,
	id,
}) => {
	const defaultCopyButtonProps = {
		label: "Copy",
		icon: <CopyIcon />,
	};
	const [copyButtonProps, setCopyButtonProps] = useState<{
		label: string;
		icon: JSX.Element;
	}>(defaultCopyButtonProps);

	const copyCodeToClipboard = (
		event: React.MouseEvent<HTMLButtonElement, MouseEvent>,
	) => {
		event.preventDefault();
		if (cmRef.current && cmRef.current.editor) {
			const content = cmRef.current.state?.doc.toString();
			if (content) {
				navigator.clipboard.writeText(content).then(
					() => {
						// Update button text to "Copied"
						setCopyButtonProps({
							label: "Copied",
							icon: <CheckIcon />,
						});

						setTimeout(() => {
							// Revert button text back to default after period of time
							setCopyButtonProps(defaultCopyButtonProps);
						}, 3000);
					},
					(err) => {
						captureException(err);
						console.error("Could not copy text: ", err);
					},
				);
			}
		}
	};

	return (
		active && (
			<HStack mt="0.5px" mr={"1px"} gap={1}>
				<Tooltip
					label={`Switch to ${type === "code" ? "markdown" : "code"}`}
					size="sm"
					fontSize={"small"}
					hasArrow
				>
					<IconButton
						size="xs"
						aria-label={`Switch to ${
							type === "code" ? "markdown" : "code"
						}`}
						icon={
							type === "code" ? <MarkdownIcon /> : <PythonIcon />
						}
						onClick={() => {
							useNotebookStore
								.getState()
								.setCellType(
									id,
									type === "code" ? "markdown" : "code",
								);
						}}
						variant="ghost"
						colorScheme="orange"
					/>
				</Tooltip>
				<Tooltip
					label="Move cell up"
					size="sm"
					fontSize={"small"}
					hasArrow
				>
					<IconButton
						size="xs"
						aria-label="Move cell up"
						icon={<ArrowUpIcon />}
						onClick={(event) => {
							useNotebookStore.getState().moveCell("up");
							event.preventDefault();
							event.stopPropagation();
						}}
						variant="ghost"
						colorScheme="orange"
						isDisabled={index === 0}
					/>
				</Tooltip>
				<Tooltip
					label="Move cell down"
					size="sm"
					fontSize={"small"}
					hasArrow
				>
					<IconButton
						size="xs"
						aria-label="Move cell down"
						icon={<ArrowDownIcon />}
						onClick={(event) => {
							useNotebookStore.getState().moveCell("down");
							event.preventDefault();
							event.stopPropagation();
						}}
						variant="ghost"
						colorScheme="orange"
						isDisabled={
							index ===
							useNotebookStore.getState().cells.length - 1
						}
					/>
				</Tooltip>
				<Tooltip
					label="Copy code"
					size="sm"
					fontSize={"small"}
					hasArrow
				>
					<IconButton
						size="xs"
						aria-label="Copy code"
						icon={copyButtonProps.icon}
						onClick={copyCodeToClipboard}
						variant="ghost"
						colorScheme="orange"
						isDisabled={!source}
					/>
				</Tooltip>
				<Tooltip
					label="Add cell above"
					size="sm"
					fontSize={"small"}
					hasArrow
				>
					<IconButton
						size="xs"
						colorScheme="orange"
						aria-label="Add cell above"
						icon={<InsertCellAboveIcon />}
						onClick={(event) => {
							useNotebookStore.getState().addCellAtIndex(index);
							event.preventDefault();
							event.stopPropagation();
						}}
						variant="ghost"
					/>
				</Tooltip>
				<Tooltip
					label="Add cell below"
					size="sm"
					fontSize={"small"}
					hasArrow
				>
					<IconButton
						size="xs"
						colorScheme="orange"
						aria-label="Add cell below"
						// Add your custom SVG here
						icon={<InsertCellBelowIcon />}
						onClick={(event) => {
							useNotebookStore
								.getState()
								.addCellAtIndex(index + 1);
							event.preventDefault();
							event.stopPropagation();
						}}
						variant="ghost"
					/>
				</Tooltip>
				<Tooltip
					label="Delete cell"
					size="sm"
					fontSize={"small"}
					hasArrow
				>
					<IconButton
						size="xs"
						colorScheme="orange"
						aria-label="Delete cell"
						icon={<DeleteIcon />}
						onClick={(event) => {
							useNotebookStore.getState().deleteActiveCell();
							event.preventDefault();
							event.stopPropagation();
						}}
						variant="ghost"
					/>
				</Tooltip>
			</HStack>
		)
	);
};

export default InputAreaToolbar;
