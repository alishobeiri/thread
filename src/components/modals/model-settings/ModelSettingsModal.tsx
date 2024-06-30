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
	Select,
	Switch,
	Text,
	VStack,
	useToast,
} from "@chakra-ui/react";
import Link from "next/link";
import { AnthropicIcon, OllamaIcon, OpenAIIcon } from "../../../assets/icons";
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
		anthropicKey,
		anthropicModel,
		anthropicBaseUrl,
		isLocal,
		setSettings,
		setModelType,
		fetchSettings,
	} = useSettingsStore.getState();

    const [show, setShow] = useState(false);
    const [tempOpenAIKey, setTempOpenAIKey] = useState("");
    const [tempServerUrl, setTempServerUrl] = useState("");
    const [tempOpenAIBaseUrl, setTempOpenAIBaseUrl] = useState("");
    const [isValid, setIsValid] = useState(true);
    const [tempModelType, setTempModelType] = useState(modelType);
    const [tempOllamaUrl, setTempOllamaUrl] = useState("");
    const [tempOllamaModel, setTempOllamaModel] = useState("");
	const [tempAnthropicKey, setTempAnthropicKey] = useState("");
	const [tempAnthropicModel, setTempAnthropicModel] = useState("");
	const [tempAnthropicBaseUrl, setTempAnthropicBaseUrl] = useState("");
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
    }, [tempOpenAIKey,
		tempOpenAIBaseUrl,
		tempOllamaModel,
		tempOllamaUrl,
		tempAnthropicKey,
		tempAnthropicModel,
		tempAnthropicBaseUrl,
		tempIsLocal,
		tempServerUrl,
		tempModelType
	]);

	useEffect(() => {
		setTempModelType(modelType);
	}, [modelType]);

    const loadSettings = () => {
        setTempOpenAIKey(openAIKey || "");
        setTempServerUrl(serverProxyUrl || API_URL);
        setTempOpenAIBaseUrl(openAIBaseUrl || "");
        setTempOllamaUrl(ollamaUrl || "");
        setTempOllamaModel(ollamaModel || "");
		setTempAnthropicKey(anthropicKey || "");
		setTempAnthropicModel(anthropicModel || "")
		setTempAnthropicBaseUrl(anthropicBaseUrl || "");
        setTempModelType(modelType || "openai");
		setTempIsLocal(isLocal || modelType === "ollama" || false);
	};

    const validate = () => {
        if (
			(tempModelType === "openai" && ((!tempOpenAIBaseUrl && tempIsLocal) || (!tempOpenAIKey && tempIsLocal))) ||
			(tempModelType === "anthropic" && ((!tempAnthropicBaseUrl && tempIsLocal) || (!tempAnthropicKey && tempIsLocal))) ||
			(tempModelType === "ollama" && (!tempOllamaModel || !tempOllamaUrl)) || 
			(!tempIsLocal && !tempServerUrl)
		){
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
            openAIBaseUrl: tempOpenAIBaseUrl,
            openAIKey: tempOpenAIKey,
            serverProxyUrl: !tempIsLocal ? tempServerUrl : "",
            ollamaUrl: tempOllamaUrl,
            ollamaModel: tempOllamaModel,
			anthropicKey: tempAnthropicKey,
			anthropicModel: tempAnthropicModel,
			anthropicBaseUrl: tempAnthropicBaseUrl,
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
                                width="33.33%"
                                variant={tempModelType === "openai" ? "solid" : "outline"}
                                leftIcon={<OpenAIIcon />}
                                onClick={() => setTempModelType("openai")}
                            >
                                OpenAI
                            </Button>
                            <Button
                                width="33.33%"
                                variant={tempModelType === "ollama" ? "solid" : "outline"}
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
							<Button
                                width="33.33%"
                                variant={tempModelType === "anthropic" ? "solid" : "outline"}
                                leftIcon={<AnthropicIcon />}
                                onClick={() => setTempModelType("anthropic")}
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
                                Anthropic
                            </Button>
                        </ButtonGroup>

                        {tempModelType === "openai" && (
                            <>
                                <FormControl
                                    id="api-key"
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
                                            onChange={(e) => setTempOpenAIKey(e.target.value)}
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
									{!tempOpenAIKey && tempIsLocal && tempModelType === "openai" && (
										<Text
											mt="2"
											fontSize="small"
											color="red.500"
										>
											API key must be set when using local API calls.
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
                                        value={tempOpenAIBaseUrl}
                                        onChange={(e) => setTempOpenAIBaseUrl(e.target.value)}
                                    />
									{!tempOpenAIBaseUrl && tempIsLocal && tempModelType === "openai" && (
										<Text
											mt="2"
											fontSize="small"
											color="red.500"
										>
											API endpoint must be set when using local API calls.
										</Text>
									)}
                                    <Text mt="2" fontSize="small" color="gray.500">
                                        Enter the base URL for OpenAI.
                                    </Text>
                                </FormControl>
                            </>
                        )}

						{ tempModelType === "ollama" && (
                            <>
                                <FormControl id="ollama-url">
                                    <FormLabel fontWeight="bold" fontSize="lg">
                                        Ollama URL
                                    </FormLabel>
                                    <Input
                                        placeholder="Enter your Ollama URL"
                                        value={tempOllamaUrl}
                                        onChange={(e) => setTempOllamaUrl(e.target.value)}
                                    />
									{!tempOllamaUrl && tempModelType === "ollama" && (
										<Text
											mt="2"
											fontSize="small"
											color="red.500"
										>
											You need to add the ollama endpoint URL.
										</Text>
									)}
                                    <Text mt="2" fontSize="small" color="gray.500">
                                        The URL of your Ollama model, e.g. http://localhost:11434/v1. If localhost doesn&apos;t work, try 0.0.0.0
                                    </Text>
                                </FormControl>
                                <FormControl id="ollama-model">
                                    <FormLabel fontWeight="bold" fontSize="lg">
                                        Ollama Model Name
                                    </FormLabel>
                                    <Input
                                        placeholder="Enter your Ollama Model Name"
                                        value={tempOllamaModel}
                                        onChange={(e) => setTempOllamaModel(e.target.value)}
                                    />
									{!tempOllamaModel && tempModelType === "ollama" && (
										<Text
											mt="2"
											fontSize="small"
											color="red.500"
										>
											You need to add the ollama model name.
										</Text>
									)}
                                    <Text mt="2" fontSize="small" color="gray.500">
                                        The name of the Ollama model being served, e.g. llama3 or codestral. For current purposes,{" "}
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

						{ tempModelType === "anthropic" && (
                            <>
								<FormControl
									id="api-key"
								>
									<FormLabel fontWeight="bold" fontSize="lg">
										Anthropic API Key
									</FormLabel>
									<InputGroup>
										<Input
											pr="4.5rem"
											type={show ? "text" : "password"}
											placeholder="Enter your Anthropic API Key"
											value={tempAnthropicKey}
											onChange={(e) => setTempAnthropicKey(e.target.value)}
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
									{!tempAnthropicKey && tempIsLocal && tempModelType === "anthropic" && (
										<Text
											mt="2"
											fontSize="small"
											color="red.500"
										>
											API key must be set if using local API calls.
										</Text>
									)}
									<Text
										mt="2"
										fontSize="small"
										color="gray.500"
									>
										For unlimited usage of Thread&apos;s AI
										features, enter your Anthropic API key
										above.
									</Text>
								</FormControl>
								<FormControl id="base-anthropic-model">
									<FormLabel fontWeight="bold" fontSize="lg">
										Anthropic Model
									</FormLabel>
									<Select value={tempAnthropicModel} placeholder={"Choose a model"} onChange={(e) => setTempAnthropicModel(e.target.value)}>
										<option value="claude-3-5-sonnet-20240620">Claude 3.5 Sonnet</option>
										<option value="claude-3-opus-20240307">Claude 3.0 Opus</option>
										<option value="claude-3-sonnet-20240307">Claude 3.0 Sonnet</option>
										<option value="claude-3-haiku-20240307">Claude 3.0 Haiku</option>
									</Select>
									<Text mt="2" fontSize="small" color="gray.500">
										Select the Anthropic model.
									</Text>
								</FormControl>
								<FormControl id="base-anthropic-url">
									<FormLabel fontWeight="bold" fontSize="lg">
										Anthropic Base URL
									</FormLabel>
									<Input
										placeholder="Enter your Anthropic Base URL"
										value={tempAnthropicBaseUrl}
										onChange={(e) => setTempAnthropicBaseUrl(e.target.value)}
									/>
									{!tempAnthropicBaseUrl && tempIsLocal && tempModelType === "anthropic" && (
										<Text
											mt="2"
											fontSize="small"
											color="red.500"
										>
											API endpoint must be set when using local API calls.
										</Text>
									)}
									<Text mt="2" fontSize="small" color="gray.500">
										Enter the base URL for Anthropic.
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
