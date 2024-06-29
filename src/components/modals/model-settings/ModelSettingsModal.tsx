import React, { useEffect, useState } from "react";
import {
	Badge,
	Button,
	ButtonGroup,
	Divider,
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
	Switch,
	Text,
	VStack,
	useToast,
} from "@chakra-ui/react";
import Link from "next/link";
import { OllamaIcon, OpenAIIcon } from "../../../assets/icons";
import { useSettingsStore } from "../../settings/SettingsStore";
import { API_URL } from "../../../utils/constants/constants";

const ModelSettingsModal = () => {
	const isOpen = useSettingsStore((state) => state.showModelSettingsModal);
	const setIsOpen = useSettingsStore(
		(state) => state.setShowModelSettingsModal,
	);
	const handleClose = () => setIsOpen(false);

	const {
		openAIKey,
		openAIBaseUrl,
		serverProxyUrl,
		modelType,
		ollamaUrl,
		ollamaModel,
		isLocal,
		setSettings,
		setModelType,
		fetchSettings,
	} = useSettingsStore.getState();

	const [show, setShow] = useState(false);
	const [tempOpenAIKey, setTempOpenAIKey] = useState("");
	const [tempServerUrl, setTempServerUrl] = useState("");
	const [tempBaseOpenAIUrl, setTempBaseOpenAIUrl] = useState("");
	const [isValid, setIsValid] = useState(true);
	const [tempModelType, setTempModelType] = useState(modelType);
	const [tempOllamaUrl, setTempOllamaUrl] = useState("");
	const [tempOllamaModel, setTempOllamaModel] = useState("");
	const [tempIsLocal, setTempIsLocal] = useState(false);
	const toast = useToast();

	useEffect(() => {
		fetchSettings();
	}, []);

	useEffect(() => {
		if (isOpen) {
			loadSettings();
		}
	}, [isOpen]);

	useEffect(() => {
		validate();
	}, [tempOpenAIKey, tempServerUrl, tempBaseOpenAIUrl, tempIsLocal]);

	useEffect(() => {
		setTempModelType(modelType);
	}, [modelType]);

	const loadSettings = () => {
		setTempOpenAIKey(openAIKey || "");
		setTempServerUrl(serverProxyUrl || API_URL);
		setTempBaseOpenAIUrl(openAIBaseUrl || "");
		setTempOllamaUrl(ollamaUrl || "");
		setTempOllamaModel(ollamaModel || "");
		setTempModelType(modelType || "openai");
		setTempIsLocal(isLocal || modelType === "ollama" || false);
	};

	const validate = () => {
		if (
			(tempBaseOpenAIUrl && !tempOpenAIKey) ||
			(!tempIsLocal && !tempServerUrl)
		) {
			setIsValid(false);
		} else {
			setIsValid(true);
		}
	};

	const saveSettings = async () => {
		if (!isValid) {
			toast({
				title: "Error",
				description: "Please check your settings and try again.",
				status: "error",
				duration: 4000,
				isClosable: true,
			});
			return;
		}

		await setSettings({
			openAIBaseUrl: tempBaseOpenAIUrl,
			openAIKey: tempOpenAIKey,
			serverProxyUrl: !tempIsLocal ? tempServerUrl : "",
			ollamaUrl: tempOllamaUrl,
			ollamaModel: tempOllamaModel,
			isLocal: tempIsLocal || tempModelType === "ollama",
			modelType: tempModelType,
		});
		setModelType(tempModelType);
		handleClose();
	};

	const toggleShowKey = () => setShow(!show);

	return (
		<Modal isOpen={isOpen} onClose={handleClose} size={["sm", "md", "lg"]}>
			<ModalOverlay />
			<ModalContent>
				<ModalHeader>Settings</ModalHeader>
				<ModalCloseButton />
				<ModalBody>
					<VStack spacing={6} fontFamily="Space Grotesk">
						<ButtonGroup
							colorScheme="orange"
							width="100%"
							isAttached
							fontFamily="Space Grotesk"
						>
							<Button
								width="50%"
								variant={
									tempModelType === "openai"
										? "solid"
										: "outline"
								}
								leftIcon={<OpenAIIcon />}
								onClick={() => setTempModelType("openai")}
							>
								OpenAI
							</Button>
							<Button
								width="50%"
								variant={
									tempModelType === "ollama"
										? "solid"
										: "outline"
								}
								leftIcon={<OllamaIcon />}
								onClick={() => setTempModelType("ollama")}
								rightIcon={
									<Badge
										fontSize="smaller"
										colorScheme="blue"
										_dark={{ background: "blue.100" }}
									>
										Beta
									</Badge>
								}
							>
								Ollama
							</Button>
						</ButtonGroup>

						{tempModelType === "openai" ? (
							<>
								<FormControl
									id="api-key"
									isInvalid={Boolean(
										tempBaseOpenAIUrl && !tempOpenAIKey,
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
												colorScheme="orange"
												h="1.75rem"
												size="sm"
												onClick={toggleShowKey}
											>
												{show ? "Hide" : "Show"}
											</Button>
										</InputRightElement>
									</InputGroup>
									{!isValid && tempBaseOpenAIUrl && (
										<Text
											mt="2"
											fontSize="small"
											color="red.500"
										>
											API key must be set if base URL or
											proxy server URL is provided.
										</Text>
									)}
									<Text
										mt="2"
										fontSize="small"
										color="gray.500"
									>
										For unlimited usage of Thread&apos;s AI
										features, enter your OpenAI API key
										above.
									</Text>
								</FormControl>
								<FormControl id="base-openai-url">
									<FormLabel fontWeight="bold" fontSize="lg">
										OpenAI Base URL
									</FormLabel>
									<Input
										placeholder="Enter your OpenAI Base URL"
										value={tempBaseOpenAIUrl}
										onChange={(e) =>
											setTempBaseOpenAIUrl(e.target.value)
										}
									/>
									<Text
										mt="2"
										fontSize="small"
										color="gray.500"
									>
										Optional: Enter the base URL for OpenAI.
									</Text>
								</FormControl>
							</>
						) : (
							<>
								<FormControl id="ollama-url">
									<FormLabel fontWeight="bold" fontSize="lg">
										Ollama URL
									</FormLabel>
									<Input
										placeholder="Enter your Ollama URL"
										value={tempOllamaUrl}
										onChange={(e) =>
											setTempOllamaUrl(e.target.value)
										}
									/>
									<Text
										mt="2"
										fontSize="small"
										color="gray.500"
									>
										The URL of your Ollama model, e.g.
										http://localhost:11434/v1. If localhost
										doesn&apos;t work, try 0.0.0.0
									</Text>
								</FormControl>
								<FormControl id="ollama-model">
									<FormLabel fontWeight="bold" fontSize="lg">
										Ollama Model Name
									</FormLabel>
									<Input
										placeholder="Enter your Ollama Model Name"
										value={tempOllamaModel}
										onChange={(e) =>
											setTempOllamaModel(e.target.value)
										}
									/>
									<Text
										mt="2"
										fontSize="small"
										color="gray.500"
									>
										The name of the Ollama model being
										served, e.g. llama3 or codestral. For
										current purposes,{" "}
										<Text
											as={Link}
											href="https://ollama.com/library/codestral"
											target="_blank"
											cursor="pointer"
											color="blue.500"
										>
											codestral
										</Text>{" "}
										is recommended.
									</Text>
								</FormControl>
							</>
						)}

						{tempModelType !== "ollama" ? (
							<>
								<Divider></Divider>

								<FormControl
									display="flex"
									flexDirection="column"
									alignItems="start"
								>
									<HStack
										width="100%"
										justifyContent="space-between"
										alignItems="center"
									>
										<FormLabel
											htmlFor="is-local"
											mb="0"
											fontWeight="bold"
											fontSize="lg"
										>
											Send API Calls Locally
										</FormLabel>
										<Switch
											id="is-local"
											colorScheme="orange"
											isChecked={tempIsLocal}
											onChange={(e) =>
												setTempIsLocal(e.target.checked)
											}
										/>
									</HStack>
									<Text
										mt="2"
										fontSize="small"
										color="gray.500"
									>
										{tempIsLocal
											? "Requests will be sent directly from the client."
											: "Turning off will require a server proxy URL."}
									</Text>
								</FormControl>

								{!tempIsLocal && (
									<FormControl id="proxy-url" mt="4">
										{" "}
										{/*Removed negative margin*/}
										<FormLabel
											htmlFor="server-proxy-url"
											fontWeight="bold"
											fontSize="md"
										>
											Server Proxy URL
										</FormLabel>
										<Text
											mt="2"
											fontSize="small"
											color="gray.500"
										>
											Enter the URL of your server proxy.
										</Text>
										<Input
											id="server-proxy-url"
											placeholder="Enter your Server Proxy URL"
											value={tempServerUrl}
											onChange={(e) =>
												setTempServerUrl(e.target.value)
											}
										/>
									</FormControl>
								)}
							</>
						) : (
							<></>
						)}
					</VStack>
				</ModalBody>
				<ModalFooter>
					<HStack width="100%" justifyContent="flex-end">
						<Button
							variant="ghost"
							colorScheme="red"
							onClick={handleClose}
							fontFamily="Space Grotesk"
						>
							Cancel
						</Button>
						<Button
							colorScheme="orange"
							onClick={saveSettings}
							isDisabled={!isValid}
							fontFamily="Space Grotesk"
						>
							Save
						</Button>
					</HStack>
				</ModalFooter>
			</ModalContent>
		</Modal>
	);
};

export default ModelSettingsModal;
