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
	VStack,
	useToast,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { useServerSettingsModalStore } from "./ServerSettingsModalStore";

const ServerSettingsModal = () => {
	const isOpen = useServerSettingsModalStore(
		(state) => state.showServerSettingsModal,
	);
	const setIsOpen = useServerSettingsModalStore(
		(state) => state.setShowServerSettingsModal,
	);
	const handleClose = () => {
		setIsOpen(false);
	};

	useServerSettingsModalStore.getState().fetchSettings();
	const openaiKey = useServerSettingsModalStore((state) => state.openAIKey);
	const serverProxyURL = useServerSettingsModalStore(
		(state) => state.serverProxyURL,
	);
	const openAIBaseUrl = useServerSettingsModalStore(
		(state) => state.openAIBaseURL,
	);
	const { setSettings } = useServerSettingsModalStore.getState();
	const [show, setShow] = useState(false);
	const [tempOpenAIKey, setTempOpenAIKey] = useState("");
	const [tempServerURL, setTempServerURL] = useState("");
	const [tempBaseOpenAIURL, setTempBaseOpenAIURL] = useState("");
	const [isValid, setIsValid] = useState(true);
	const toast = useToast();

	const loadSettings = () => {
		setTempOpenAIKey(openaiKey || "");
		setTempServerURL(serverProxyURL || "");
		setTempBaseOpenAIURL(openAIBaseUrl || "");
	};

	const validate = () => {
		if (tempBaseOpenAIURL && !tempOpenAIKey) {
			setIsValid(false);
		} else {
			setIsValid(true);
		}
	};

	const saveSettings = () => {
		if (!isValid) {
			toast({
				title: "Error",
				description: "API key must be set if base URL is provided.",
				status: "error",
				duration: 4000,
				isClosable: true,
			});
			return;
		}
		setSettings({
			openAIBaseURL: tempBaseOpenAIURL,
			openAIKey: tempOpenAIKey,
			serverProxyURL: tempServerURL,
		});
		handleClose();
	};

	useEffect(() => {
		if (isOpen) {
			loadSettings();
		}
	}, [isOpen]);

	useEffect(() => {
		validate();
	}, [tempOpenAIKey, tempServerURL, tempBaseOpenAIURL]);

	const toggleShowKey = () => setShow(!show);

	return (
		<Modal isOpen={isOpen} onClose={handleClose} size={["sm", "md", "lg"]}>
			<ModalOverlay />
			<ModalContent>
				<ModalHeader>Server Settings</ModalHeader>
				<ModalCloseButton />
				<ModalBody>
					<VStack spacing={10}>
						<FormControl
							id="api-key"
							isInvalid={Boolean(
								tempBaseOpenAIURL && !tempOpenAIKey,
							)}
						>
							<FormLabel fontWeight="bold" fontSize="lg">
								OpenAI API Key
							</FormLabel>
							<InputGroup>
								<Input
									pr="4.5rem"
									type={show ? "text" : "password"}
									placeholder="Enter your OpenAI API Key"
									value={tempOpenAIKey}
									onChange={(e) =>
										setTempOpenAIKey(e.target.value)
									}
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
							{!isValid && tempBaseOpenAIURL && (
								<Text mt="2" fontSize="small" color="red.500">
									API key must be set if base URL or proxy URL
									is provided.
								</Text>
							)}
							<Text mt="2" fontSize="small" color="gray.500">
								For unlimited usage of Thread&apos;s AI
								features, enter your OpenAI API key above.
							</Text>
						</FormControl>
						<FormControl id="base-openai-url">
							<FormLabel fontWeight="bold" fontSize="lg">
								OpenAI Base URL
							</FormLabel>
							<Input
								placeholder="Enter your OpenAI Base URL"
								value={tempBaseOpenAIURL}
								onChange={(e) =>
									setTempBaseOpenAIURL(e.target.value)
								}
							/>
							<Text mt="2" fontSize="small" color="gray.500">
								Optional: Enter the base URL for OpenAI.
							</Text>
						</FormControl>
						<FormControl id="proxy-url">
							<FormLabel fontWeight="bold" fontSize="lg">
								Server Proxy URL
							</FormLabel>
							<Input
								placeholder="Enter your Server Proxy URL"
								value={tempServerURL}
								onChange={(e) =>
									setTempServerURL(e.target.value)
								}
							/>
							<Text mt="2" fontSize="small" color="gray.500">
								Optional: Enter the URL of your server proxy.
							</Text>
						</FormControl>
					</VStack>
				</ModalBody>
				<ModalFooter>
					<HStack width="100%" justifyContent="flex-end">
						<Button
							variant="ghost"
							colorScheme="red"
							onClick={handleClose}
							fontFamily={"Space Grotesk"}
						>
							Cancel
						</Button>
						<Button
							colorScheme="orange"
							onClick={saveSettings}
							fontFamily={"Space Grotesk"}
							isDisabled={!isValid}
						>
							Save
						</Button>
					</HStack>
				</ModalFooter>
			</ModalContent>
		</Modal>
	);
};

export default ServerSettingsModal;
