import {
	Box,
	HStack,
	Heading,
	Kbd,
	List,
	ListItem,
	Modal,
	ModalBody,
	ModalContent,
	ModalHeader,
	ModalOverlay,
	Text,
} from "@chakra-ui/react";
import { KeyboardIcon } from "../../../assets/icons";
import { isPlatformMac } from "../../../utils/utils";
import { useShortcutsModalStore } from "./ShortcutsModalStore";

function ShortcutList({
	shortcuts = [],
}: {
	shortcuts: { keystroke: string; description: string }[];
}) {
	return (
		<Box width="100%">
			<List spacing={3}>
				{shortcuts.map((shortcut) => (
					<ListItem key={shortcut.keystroke}>
						<HStack justifyContent={"space-between"}>
							<Text fontSize="sm" ml={2}>
								{shortcut.description}
							</Text>
							<Kbd>{shortcut.keystroke}</Kbd>
						</HStack>
					</ListItem>
				))}
			</List>
		</Box>
	);
}

export default function ShortcutsCheatSheetModal() {
	const isOpen = useShortcutsModalStore((state) => state.showShortcutsModal);
	const { setShowShortcutsModal } = useShortcutsModalStore.getState();

	const handleClose = () => {
		setShowShortcutsModal(false);
	};

	return (
		<Modal
			isOpen={isOpen}
			onClose={handleClose}
			size={["sm", "md", "lg", "2xl", "4xl"]}
		>
			<ModalOverlay />
			<ModalContent
				mx="auto"
				my="auto"
				boxShadow={"xl"}
				maxHeight="80%"
				minWidth="0px"
			>
				<ModalHeader fontSize="xl">
					<HStack gap={3}>
						<KeyboardIcon />
						<Text>Keyboard Shortcuts</Text>
					</HStack>
				</ModalHeader>
				<ModalBody overflow={"auto"}>
					<Heading as="h3" fontSize="md" mb="4">
						General actions
					</Heading>
					<ShortcutList
						shortcuts={[
							{
								keystroke: isPlatformMac()
									? "⌘ + K"
									: "Ctrl + K",
								description: "Focus input / Toggle input modes",
							},
							{
								keystroke: "↑↓",
								description: "Navigate cells",
							},
							{
								keystroke: "a",
								description: "Add code cell above",
							},
							{
								keystroke: "b",
								description: "Add code cell below",
							},
							{
								keystroke: "Enter",
								description: "Enter edit mode",
							},
							{
								keystroke: "d + d",
								description: "Delete cell",
							},
							{
								keystroke: "Ctrl + Enter",
								description: "Run cell",
							},
							{
								keystroke: "Shift + Enter",
								description: "Run cell and advance to next",
							},
							{
								keystroke: isPlatformMac()
									? "⌘ + B"
									: "Ctrl + B",
								description: "Run cell and advance to next",
							},
							{
								keystroke: isPlatformMac()
									? "⌘ + Z"
									: "Ctrl + Z",
								description: "Undo cell operation",
							},
							{
								keystroke: isPlatformMac()
									? "⌘ + Shift + Z"
									: "Ctrl + Shift + Z",
								description: "Redo cell operation",
							},
						]}
					/>
					<Heading as="h3" fontSize="md" my="4">
						Cell actions
					</Heading>
					<ShortcutList
						shortcuts={[
							{
								keystroke: isPlatformMac()
									? "⌘ + K"
									: "Ctrl + K",
								description: "Generate code / Edit cell",
							},
							{
								keystroke: "Escape",
								description: "Exit edit mode",
							},
						]}
					/>
					<Box my="4" />
				</ModalBody>
			</ModalContent>
		</Modal>
	);
}
