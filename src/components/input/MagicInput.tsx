import {
	Button,
	HStack,
	IconButton,
	Menu,
	MenuButton,
	MenuItem,
	MenuList,
	Textarea,
	VStack,
	Text,
	Box,
	Tooltip,
} from "@chakra-ui/react";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import ResizeTextarea from "react-textarea-autosize";
import { ChatSubmitIcon, CodeIcon, QuestionMarkIcon } from "../../assets/icons";
import {
	CELL_GUTTER_WIDTH,
	CELL_MINIMUM_HEIGHT,
} from "../../utils/constants/constants";
import { trackClickEvent } from "../../utils/posthog";
import SpinnerWithStopButton from "../misc/SpinnerWithStopButton";
import { useNotebookStore } from "../notebook/store/NotebookStore";
import { MagicInputSelections, useMagicInputStore } from "./MagicInputStore";
import {
	ArrowDownIcon,
	ArrowUpIcon,
	ChevronUpIcon,
	CloseIcon,
} from "@chakra-ui/icons";
import { isInViewport, isPlatformMac } from "../../utils/utils";
import useCellStore, { CellStatus } from "../cell/store/CellStore";
import { enableCommandMode } from "../cell/actions/actions";
import { useChatStore } from "../sidebar/chat/store/ChatStore";

const goToActiveCell = (mainPanelRef: React.RefObject<HTMLDivElement>) => {
	const activeCell = document.querySelector(".active-cell");
	if (activeCell && mainPanelRef.current) {
		const offset = 100;
		const elementTop = activeCell.getBoundingClientRect().top;
		const containerScrollTop = mainPanelRef.current.scrollTop;
		const containerTop = mainPanelRef.current.getBoundingClientRect().top;
		const relativeTop = elementTop + containerScrollTop - containerTop;
		const offsetPosition = relativeTop - offset;

		mainPanelRef.current.scrollTo({
			top: offsetPosition,
		});
	}
};

export function GoToActiveCell({
	mainPanelRef,
}: {
	mainPanelRef: React.RefObject<HTMLDivElement>;
}) {
	const [showGoToActiveCell, setShowGoToActiveCell] = useState(false);
	const [isAbove, setIsAbove] = useState(true);

	const checkCellPosition = () => {
		const activeCell = document.querySelector(".active-cell");
		if (!activeCell) return;
		const cellEditor = activeCell.querySelector(".cell-editor");

		if (isInViewport(cellEditor)) {
			setShowGoToActiveCell(false);
		} else {
			setShowGoToActiveCell(true);
		}

		// You can also check the position of the cell editor relative to the viewport
		if (cellEditor) {
			const rect = cellEditor.getBoundingClientRect();
			const isAboveViewport = rect.top < 0;
			setIsAbove(isAboveViewport);
		}
	};

	useEffect(() => {
		if (!mainPanelRef.current) return;
		mainPanelRef.current.addEventListener("click", checkCellPosition);
		mainPanelRef.current.addEventListener("scroll", checkCellPosition);

		return () => {
			if (!mainPanelRef.current) return;
			mainPanelRef.current.removeEventListener(
				"click",
				checkCellPosition,
			);
			mainPanelRef.current.removeEventListener(
				"scroll",
				checkCellPosition,
			);
		};
	}, []);

	return (
		<Box
			as="span"
			display="flex"
			width={`${CELL_GUTTER_WIDTH - 5}px`}
			justifyContent={"flex-end"}
			visibility={showGoToActiveCell ? "visible" : "hidden"}
		>
			<IconButton
				aria-label="Go to active cell"
				size="sm"
				variant="outline"
				borderRadius={"full"}
				icon={isAbove ? <ArrowUpIcon /> : <ArrowDownIcon />}
				backgroundColor="var(--jp-layout-color1)"
				onClick={() => {
					goToActiveCell(mainPanelRef);
				}}
			/>
		</Box>
	);
}

const RightIcon = ({
	isLoading,
	handleQuery,
	value,
}: {
	isLoading: boolean;
	handleQuery: (value: string) => void;
	value: string;
}) => {
	const onStopClick = () => {
		trackClickEvent("[MagicQuery] aborted");
		useNotebookStore.getState().abortMagicQuery();
	};

	return isLoading ? (
		<SpinnerWithStopButton isSpinning={true} onClick={onStopClick} />
	) : (
		<IconButton
			p={1}
			borderRadius="md"
			colorScheme="orange"
			isDisabled={false}
			icon={<ChatSubmitIcon />}
			onClick={() => handleQuery(value)}
			aria-label="Send query"
		/>
	);
};

export const MagicInput = ({
	refToTrack,
}: {
	refToTrack: React.RefObject<HTMLDivElement>;
}) => {
	const textareaBackgroundColor = "var(--jp-layout-color1)";
	const textareaBorderColor = "var(--jp-border-color2)";
	const notebookMode = useNotebookStore((state) => state.notebookMode);
	const isGeneratingCells = useNotebookStore(
		(state) => state.isGeneratingCells,
	);
	const activeCellIndex = useNotebookStore((state) => state.activeCellIndex);
	const activeCell = useNotebookStore.getState().getActiveCell();
	const cellState =
		useCellStore((state) => state.cellStates)[activeCell.id as string] ??
		{};
	const previousQuery = cellState.previousQuery;
	const selectedCode = useMagicInputStore((state) => state.selectedCode);
	const selectedOption = useMagicInputStore((state) => state.selectedOption);
	const setSelectedCode = useMagicInputStore.getState().setSelectedCode;
	const setSelectedOption = useMagicInputStore.getState().setSelectedOption;
	const availableSelections = useMagicInputStore(
		(state) => state.availableSelections,
	);
	const {
		acceptAndRunProposedSource,
		acceptProposedSource,
		rejectProposedSource,
	} = useCellStore.getState();
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	const getCommandKey = () => {
		const isMac = isPlatformMac();
		let commandKey;

		if (isGeneratingCells) {
			commandKey = `${isMac ? "⌘" : "Ctrl"} + ⌫ to stop`;
		} else {
			const focusState = isFocused ? "switch modes" : "focus";
			commandKey = `${isMac ? "⌘" : "Ctrl"} + K to ${focusState}`;
		}

		return commandKey;
	};

	useEffect(() => {
		// Primary hook to keep updating the available actions
		useMagicInputStore.getState().updateStore(notebookMode, cellState);
	}, [notebookMode, activeCellIndex, cellState.status, selectedCode]);

	const lines = selectedCode.split("\n").length;

	useMagicInputStore.getState().setTextareaRef(textareaRef);

	const value = useMagicInputStore((state) => state.value);
	const { setValue, handleQuery } = useMagicInputStore.getState();

	const [isFocused, setIsFocused] = useState(false);

	const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
		setValue(e.target.value);
	};

	const handleKeyPress = (
		event: React.KeyboardEvent<HTMLTextAreaElement>,
	) => {
		const { selectedOption, availableSelections, setSelectedOption } =
			useMagicInputStore.getState();

		// Handle meta/ctrl + Enter
		if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
			if (event.shiftKey) {
				acceptAndRunProposedSource(activeCell.id as string);
			} else {
				acceptProposedSource(activeCell.id as string);
			}
			event.preventDefault();
		} else if (
			(event.metaKey || event.ctrlKey) &&
			event.key === "Backspace"
		) {
			if (isGeneratingCells) {
				useNotebookStore.getState().abortMagicQuery();
				event.preventDefault();
				if (useChatStore.getState().isResponding) {
					useChatStore.getState().abortController.abort();
					event.preventDefault();
				}
			} else if (cellState.status == CellStatus.FollowUp) {
				rejectProposedSource(activeCell.id as string);
				event.preventDefault();
			}
		} else if (
			event.key === "Enter" &&
			!event.shiftKey &&
			!isGeneratingCells
		) {
			// Handle Enter key without Shift
			handleQuery(value);
			event.stopPropagation();
			event.preventDefault();
		} else if (event.key === "Escape") {
			// Handle Escape key
			if (selectedCode !== "") {
				setSelectedCode("");
			} else if (textareaRef.current) {
				textareaRef.current.blur();
			}
		} else if ((event.metaKey || event.ctrlKey) && event.key === "k") {
			// Handle meta/ctrl + k
			const currentIndex = availableSelections.indexOf(
				selectedOption as MagicInputSelections,
			);
			const nextIndex = (currentIndex + 1) % availableSelections.length;
			setSelectedOption(availableSelections[nextIndex]);
			event.preventDefault();
		}
	};

	const handleOptionSelect = (option: MagicInputSelections) => {
		setSelectedOption(option);
	};

	const getPlaceholderText = () => {
		if (selectedOption === MagicInputSelections.FollowUp) {
			return `How would you like to follow up?`;
		} else if (selectedOption === MagicInputSelections.Edit) {
			if (selectedCode !== "") {
				return `How would you like to edit this selection?`;
			}
			return `How would you like to edit this cell?`;
		} else if (selectedOption === MagicInputSelections.Chat) {
			return `What would you like to ask?`;
		}
		return `What would you like to generate?`;
	};

	return (
		<HStack
			width={"100%"}
			bottom="40px"
			left="0"
			right="0"
			borderColor="gray.200"
			zIndex="1"
			mx="auto"
			backgroundColor="transparent"
			position={"absolute"}
			borderRadius="xl"
		>
			<GoToActiveCell mainPanelRef={refToTrack} />
			<VStack
				position="relative"
				minHeight={`${CELL_MINIMUM_HEIGHT}px`}
				flex="1"
				overflow="hidden"
				tabIndex={0}
				borderWidth={"2px"}
				backgroundColor={textareaBackgroundColor}
				borderRadius="xl"
				boxShadow={"md"}
				alignItems="center"
				pl={"0.5rem"}
				pr={"0.5rem"}
				mr={"0.40rem"}
				gap={0}
				borderColor={
					isFocused
						? `${"var(--jp-brand-color1)"}`
						: `${textareaBorderColor}`
				}
			>
				<Box
					position="absolute"
					top="0rem"
					left="50%"
					transform="translateX(-50%)"
				>
					<Text
						fontFamily="Space Grotesk"
						fontSize="xs"
						color="gray.500"
						m={0}
						p={0}
					>
						{getCommandKey()}
					</Text>
				</Box>
				{selectedCode != "" && (
					<HStack
						alignSelf={"flex-start"}
						mt={4}
						px={4}
						py={1}
						w={"100%"}
						bg={"var(--jp-layout-color2)"}
						borderRadius={"lg"}
						justifyContent={"space-between"}
						cursor={"pointer"}
						onClick={() => {
							goToActiveCell(refToTrack);
						}}
					>
						<HStack
							gap={4}
							justifyContent="center"
							alignItems="center"
						>
							<CodeIcon boxSize={"0.7em"} />
							<Text
								fontFamily={"Space Grotesk"}
								fontSize={"sm"}
							>{`Selected ${
								selectedCode.split("\n").length
							} line${lines > 1 ? "s" : ""}`}</Text>
						</HStack>
						<IconButton
							size={"0.1em"}
							icon={<CloseIcon boxSize={"0.7em"} />}
							variant={"ghost"}
							aria-label="Close"
							onClick={(event) => {
								setSelectedCode("");
							}}
						/>
					</HStack>
				)}
				{previousQuery &&
					selectedOption == MagicInputSelections.FollowUp && (
						<HStack
							alignSelf="stretch"
							w="100%"
							justifyContent="flex-start"
							alignItems="center"
							mt={2}
							p={2}
							py={0}
							bg={"var(--jp-layout-color1)"}
							borderRadius="md"
							pl={4}
						>
							<QuestionMarkIcon boxSize={"0.7em"} />
							<Tooltip label={previousQuery} hasArrow>
								<Text
									fontFamily={"Space Grotesk"}
									fontSize={"sm"}
									ml={2}
									isTruncated
								>
									{previousQuery}
								</Text>
							</Tooltip>
						</HStack>
					)}
				<HStack width={"100%"}>
					<Menu>
						<MenuButton
							as={Button}
							colorScheme="orange"
							size="md"
							rightIcon={<ChevronUpIcon />}
							variant="ghost"
							fontFamily="Space Grotesk"
							px={4}
						>
							<Text pr={4}>{selectedOption}</Text>
						</MenuButton>
						<MenuList fontFamily="Space Grotesk">
							{availableSelections.map((option) => (
								<MenuItem
									key={option}
									onClick={() => handleOptionSelect(option)}
								>
									<Text>{option}</Text>
								</MenuItem>
							))}
						</MenuList>
					</Menu>

					<Textarea
						ref={textareaRef}
						id="generate-textarea"
						onChange={handleChange}
						value={value}
						onKeyDown={handleKeyPress}
						onFocus={() => {
							setIsFocused(true);
							enableCommandMode();
						}}
						onBlur={() => setIsFocused(false)}
						boxShadow="none"
						outline="none"
						border="0px solid transparent"
						as={ResizeTextarea}
						py="1rem"
						pl="0"
						pr="1rem"
						rows={1}
						placeholder={getPlaceholderText()}
						_placeholder={{
							fontFamily: "Space Grotesk",
						}}
						flexGrow={1}
						minRows={1}
						maxRows={4}
						width="100%"
						resize="none"
						_focusVisible={{
							outline: "none",
						}}
					/>
					<RightIcon
						isLoading={isGeneratingCells}
						handleQuery={handleQuery}
						value={value}
					/>
				</HStack>
			</VStack>
		</HStack>
	);
};
