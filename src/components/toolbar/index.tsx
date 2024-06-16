import { AddIcon } from "@chakra-ui/icons";
import {
	Badge,
	Box,
	Button,
	ButtonGroup,
	HStack,
	Menu,
	MenuItem,
	MenuList,
	Text,
	Tooltip,
} from "@chakra-ui/react";
import React, { useEffect, useState } from "react";
import {
	OllamaIcon,
	OpenAIIcon,
	PlayIcon,
	SquareIcon,
} from "../../assets/icons";
import ConnectionManager from "../../services/connection/connectionManager";
import { getCellTypesWithHandlers } from "../../utils/cellOptions";
import { useSettingsStore } from "../settings/SettingsStore";
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
				<Tooltip
					label="Execute all cells in this notebook"
					hasArrow
					borderRadius={"md"}
				>
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
				</Tooltip>
			)}
		</ButtonGroup>
	);
};

function ModelTypeSwitcher() {
	const modelType = useSettingsStore((state) => state.modelType);

	return (
		<Tooltip
			hasArrow
			fontSize="sm"
			borderRadius={"md"}
			placement="bottom"
			label={"Select the model you want to use"}
		>
			<Button
				aria-label="Open modal to select model"
				size="sm"
				leftIcon={
					modelType === "openai" ? <OpenAIIcon /> : <OllamaIcon />
				}
				colorScheme="orange"
				fontFamily={"Space Grotesk"}
				onClick={() => {
					useSettingsStore.getState().setShowModelSettingsModal(true);
				}}
				rightIcon={
					modelType === "openai" ? undefined : (
						<Badge
							fontSize="smaller"
							colorScheme="blue"
							_dark={{ background: "blue.100" }}
						>
							Beta
						</Badge>
					)
				}
				backgroundColor="var(--chakra-colors-chakra-body-bg)"
				variant="outline"
			>
				{modelType === "openai" ? "OpenAI" : "Ollama"}
			</Button>
		</Tooltip>
	);
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
					<ModelTypeSwitcher />
				</HStack>
				<HStack>
					<RunModeSelector />
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
