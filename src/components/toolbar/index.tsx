import { AddIcon, ChevronDownIcon } from "@chakra-ui/icons";
import {
	Box,
	Button,
	ButtonGroup,
	Flex,
	HStack,
	Menu,
	MenuButton,
	MenuItem,
	MenuList,
	Text,
	Tooltip,
} from "@chakra-ui/react";
import capitalize from "lodash/capitalize";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { PlayIcon, SquareIcon } from "../../assets/icons";
import ConnectionManager from "../../services/connection/connectionManager";
import { getCellTypesWithHandlers } from "../../utils/cellOptions";
import { CELL_GUTTER_WIDTH } from "../../utils/constants/constants";
import { ICellTypes, useNotebookStore } from "../notebook/store/NotebookStore";
import { triggerCellActionFailureToast } from "../toasts";

const RunModeSelector = () => {
	const { executeSelectedCells, executeAllCells } =
		useNotebookStore.getState();
	const executingCells = useNotebookStore((state) => state.executingCells);
	const [toolbarMode, setToolbarMode] = useState("notebook");

	useEffect(() => {
		if (executingCells.size > 0) {
			setToolbarMode("interrupt");
		} else {
			setToolbarMode("notebook");
		}
	}, [executingCells]);

	const handleRunClick = () => {
		executeAllCells();
	};

	const handleInterruptClick = () => {
		ConnectionManager.getInstance().kernel?.interrupt();
	};

	return (
		<ButtonGroup isAttached>
			{toolbarMode === "interrupt" ? (
				<Button
					size="sm"
					leftIcon={<SquareIcon boxSize="9px" />}
					variant="outline"
					onClick={handleInterruptClick}
					backgroundColor="var(--chakra-colors-chakra-body-bg)"
					fontFamily={"Space Grotesk"}
					colorScheme="orange"
				>
					Interrupt kernel
				</Button>
			) : (
				<Button
					size="sm"
					leftIcon={<PlayIcon />}
					variant="outline"
					onClick={handleRunClick}
					backgroundColor="var(--chakra-colors-chakra-body-bg)"
					colorScheme="orange"
					fontFamily={"Space Grotesk"}
				>
					Run all cells
				</Button>
			)}
		</ButtonGroup>
	);
};

const CellTypeMenu: React.FC<{
	formattedType: string;
	cellId: string;
}> = React.memo(
	({ formattedType, cellId }) => {
		const { setCellType } = useNotebookStore.getState();
		const handlePythonClick = useCallback(
			() => setCellType(cellId, "code"),
			[cellId, setCellType],
		);
		const handleMarkdownClick = useCallback(
			() => setCellType(cellId, "markdown"),
			[cellId, setCellType],
		);

		const menuItems = getCellTypesWithHandlers({
			code: handlePythonClick,
			markdown: handleMarkdownClick,
		});

		return (
			<Menu>
				<Tooltip
					hasArrow
					borderRadius={"md"}
					placement="bottom"
					label={"Select the cell type"}
				>
					<MenuButton
						as={Button}
						aria-label="Run Options"
						size="sm"
						variant="outline"
						backgroundColor="var(--chakra-colors-chakra-body-bg)"
						colorScheme="orange"
						rightIcon={<ChevronDownIcon />}
						fontFamily={"Space Grotesk"}
					>
						{formattedType}
					</MenuButton>
				</Tooltip>

				<MenuList width="fit-content">
					{menuItems.map(({ icon, label, handler }) => {
						return (
							<MenuItem
								key={`menu-item-${label}`}
								icon={icon}
								onClick={handler}
								fontFamily={"Space Grotesk"}
							>
								<Text fontSize="small">{label}</Text>
							</MenuItem>
						);
					})}
				</MenuList>
			</Menu>
		);
	},
	(prevProps, nextProps) =>
		prevProps.formattedType === nextProps.formattedType &&
		prevProps.cellId === nextProps.cellId,
);

CellTypeMenu.displayName = "CellTypeMenu";

function CellTypeSwitcher() {
	const cells = useNotebookStore((state) => state.cells);
	const activeCellIndex = useNotebookStore((state) => state.activeCellIndex);

	const cell = useMemo(
		() => cells[activeCellIndex],
		[cells, activeCellIndex],
	);
	if (!cell) return null;

	const cellId = cell.id as string;

	const { cell_type } = cell;

	const formattedType =
		cell_type === "code" ? "Python" : capitalize(cell_type as string);

	return <CellTypeMenu formattedType={formattedType} cellId={cellId} />;
}

export default function Toolbar({
	mainPanelRef,
}: {
	mainPanelRef: React.RefObject<HTMLDivElement>;
}) {
	const getHandler = (type: ICellTypes) => {
		return () => {
			const { addCellAtIndex, activeCellIndex } =
				useNotebookStore.getState();
			addCellAtIndex(activeCellIndex + 1, "", type as ICellTypes);
		};
	};

	const menuItems = getCellTypesWithHandlers({
		code: getHandler("code"),
		markdown: getHandler("markdown"),
	});

	return (
		<Box
			alignItems={"flex-end"}
			paddingY="4"
			position="absolute"
			zIndex="10"
			width="80%"
			top={0}
			maxWidth="1200px"
			mx="auto"
		>
			<HStack justifyContent={"space-between"} width={"100%"}>
				<HStack gap={2}>
					<Flex width={`${CELL_GUTTER_WIDTH}px`} />
				</HStack>
				<HStack>
					<RunModeSelector />
					<CellTypeSwitcher />
					<Menu>
						<Tooltip
							hasArrow
							fontSize="sm"
							borderRadius={"md"}
							placement="bottom"
							label={"Insert a Python cell below (B)"}
						>
							<Button
								aria-label="Add Python cell"
								size="sm"
								leftIcon={
									<HStack>
										<AddIcon boxSize="10px" />
									</HStack>
								}
								variant="outline"
								backgroundColor="var(--chakra-colors-chakra-body-bg)"
								onClick={getHandler("code")}
								colorScheme="orange"
								fontFamily={"Space Grotesk"}
							>
								Python
							</Button>
						</Tooltip>
						<Tooltip
							hasArrow
							fontSize="sm"
							borderRadius={"md"}
							placement="bottom"
							label={"Insert a Markown cell below"}
						>
							<Button
								aria-label="Add markdown cell"
								size="sm"
								leftIcon={<AddIcon boxSize="10px" />}
								variant="outline"
								backgroundColor="var(--chakra-colors-chakra-body-bg)"
								onClick={getHandler("markdown")}
								colorScheme="orange"
								fontFamily={"Space Grotesk"}
							>
								Markdown
							</Button>
						</Tooltip>
						<MenuList>
							{menuItems.map(({ icon, label, handler }) => {
								return (
									<MenuItem
										key={`add-cell-button-${label}`}
										icon={icon}
										onClick={() => {
											const { isGeneratingCells } =
												useNotebookStore.getState();
											if (isGeneratingCells) {
												triggerCellActionFailureToast(
													"addition",
												);
												return;
											}
											handler();
										}}
									>
										<Text fontSize="small">{label}</Text>
									</MenuItem>
								);
							})}
						</MenuList>
					</Menu>
				</HStack>
			</HStack>
		</Box>
	);
}
