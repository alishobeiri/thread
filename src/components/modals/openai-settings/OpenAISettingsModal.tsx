import {
	Button,
	FormControl,
	FormLabel,
	HStack,
	Input,
	InputGroup,
	InputRightElement,
	Modal,
	ModalBody,
	ModalCloseButton,
	ModalContent,
	ModalFooter,
	ModalHeader,
	ModalOverlay,
	Text,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { useOpenAISettingsModalStore } from "./OpenAISettingsModalStore";

const OpenAISettingsModal = () => {
	const isOpen = useOpenAISettingsModalStore(
		(state) => state.showOpenAISettingsModal,
	);
	const setIsOpen = useOpenAISettingsModalStore(
		(state) => state.setShowOpenAISettingsModal,
	);
	const handleClose = () => {
		setIsOpen(false);
	};

	useOpenAISettingsModalStore.getState().fetchOpenAIKey();
	const openAIKey = useOpenAISettingsModalStore((state) => state.openAIKey);
	const { setOpenAIKey } = useOpenAISettingsModalStore.getState();
	const [show, setShow] = useState(false);
	const [tempApiKey, setTempApiKey] = useState("");

	const loadSettings = () => {
		setTempApiKey(openAIKey || "");
	};

	const saveSettings = () => {
		setOpenAIKey(tempApiKey);
		handleClose();
	};

	useEffect(() => {
		if (isOpen) {
			loadSettings();
		}
	}, [isOpen]);

	const toggleShowKey = () => setShow(!show);

	return (
		<Modal isOpen={isOpen} onClose={handleClose} size={["sm", "md", "lg"]}>
			<ModalOverlay />
			<ModalContent>
				<ModalHeader>Settings</ModalHeader>
				<ModalCloseButton />
				<ModalBody>
					<FormControl id="api-key">
						<FormLabel fontWeight="bold" fontSize="lg">
							OpenAI API Key
						</FormLabel>
						<InputGroup>
							<Input
								pr="4.5rem"
								type={show ? "text" : "password"}
								placeholder="Enter your OpenAI API Key"
								value={tempApiKey}
								onChange={(e) => setTempApiKey(e.target.value)}
							/>
							<InputRightElement width="4.5rem">
								<Button
									h="1.75rem"
									size="sm"
									onClick={toggleShowKey}
								>
									{show ? "Hide" : "Show"}
								</Button>
							</InputRightElement>
						</InputGroup>
						<Text mt="2" fontSize="small" color="gray.500">
							For unlimited usage of Thread, enter your OpenAI API
							key above.
						</Text>
					</FormControl>
				</ModalBody>
				<ModalFooter>
					<HStack width="100%" justifyContent="flex-end">
						<Button
							variant="ghost"
							colorScheme="red"
							onClick={handleClose}
						>
							Cancel
						</Button>
						<Button colorScheme="orange" onClick={saveSettings}>
							Save
						</Button>
					</HStack>
				</ModalFooter>
			</ModalContent>
		</Modal>
	);
};

export default OpenAISettingsModal;
