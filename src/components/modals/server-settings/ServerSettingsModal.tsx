import {
	Button,
	FormControl,
	FormLabel,
	HStack,
	Input,
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
import { useSettingsStore } from "../../settings/SettingsStore";

const ServerSettingsModal = () => {
	const isOpen = useSettingsStore((state) => state.showServerSettingsModal);
	const setIsOpen = useSettingsStore(
		(state) => state.setShowServerSettingsModal,
	);
	const handleClose = () => {
		setIsOpen(false);
	};

	useEffect(() => {
		useSettingsStore.getState().fetchSettings();
	}, []);

	const serverProxyUrl = useSettingsStore((state) => state.serverProxyUrl);
	const { setServerProxyUrl } = useSettingsStore.getState();
	const [tempServerUrl, setTempServerUrl] = useState("");
	const toast = useToast();

	const loadSettings = () => {
		setTempServerUrl(serverProxyUrl || "");
	};

	const saveSettings = async () => {
		await setServerProxyUrl(tempServerUrl);
		handleClose();
	};

	useEffect(() => {
		if (isOpen) {
			loadSettings();
		}
	}, [isOpen]);

	return (
		<Modal isOpen={isOpen} onClose={handleClose} size={["sm", "md", "lg"]}>
			<ModalOverlay />
			<ModalContent>
				<ModalHeader>Server Settings</ModalHeader>
				<ModalCloseButton />
				<ModalBody>
					<VStack>
						<FormControl id="proxy-url">
							<FormLabel
								fontWeight="bold"
								fontSize="lg"
								fontFamily={"Space Grotesk"}
							>
								Server Proxy URL
							</FormLabel>
							<Input
								placeholder="Enter your Server Proxy URL"
								value={tempServerUrl}
								onChange={(e) =>
									setTempServerUrl(e.target.value)
								}
							/>
							<Text mt="2" fontSize="small" color="gray.500">
								Optional: Enter the URL of your server proxy. If
								using a local model, this should point to
								http://localhost:5001 or whichever port serves
								the proxy.
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
