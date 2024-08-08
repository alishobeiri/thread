import {
	Button,
	HStack,
	Heading,
	Modal,
	ModalBody,
	ModalContent,
	ModalFooter,
	ModalOverlay,
	Text,
	VStack,
} from "@chakra-ui/react";
import Link from "next/link";
import { MAX_AI_API_CALLS } from "../../../hooks/useApiCallStore";
import { useSettingsStore } from "../../settings/SettingsStore";
import { useQueryLimitModalStore } from "./QueryLimitModalStore";

const QueryLimitModal = () => {
	const isOpen = useQueryLimitModalStore(
		(state) => state.showQueryLimitModal,
	);
	const setIsOpen = useQueryLimitModalStore(
		(state) => state.setShowQueryLimitModal,
	);

	const handleClose = () => {
		setIsOpen(false);
	};

	return (
		<Modal isOpen={isOpen} onClose={handleClose} size={["sm", "md", "xl"]}>
			<ModalOverlay />
			<ModalContent
				fontFamily={"Space Grotesk"}
				borderRadius={"2xl"}
				mx="auto"
				my="auto"
				boxShadow={"xl"}
				minWidth="0px"
				p="2"
				maxHeight="95%"
				overflow={"auto"}
			>
				<ModalBody p={6} overflow={"auto"}>
					<VStack mb="4" tabIndex={-1} alignItems={"flex-start"}>
						<Heading
							textAlign="left"
							fontFamily={"Space Grotesk"}
							fontSize={["20px", "24px", "32px"]}
						>
							Settings
						</Heading>
					</VStack>
					<VStack width="100%" gap={6} alignItems={"flex-start"}>
						<Text>
							You have exceeded the AI query limit of{" "}
							{MAX_AI_API_CALLS} API calls. Please reach out to{" "}
							<Text
								as={Link}
								href="mailto:ali@vizlylabs.com"
								color="orange.400"
							>
								ali@vizlylabs.com
							</Text>{" "}
							to increase your limit.
						</Text>
						<Text>
							You can also enter your own OpenAI API key{" "}
							<Text
								as="span"
								onClick={() => {
									handleClose();
									useSettingsStore
										.getState()
										.setShowModelSettingsModal(true);
								}}
								cursor={"pointer"}
								color="orange.400"
							>
								here
							</Text>{" "}
							for unlimited usage of VizlyNotebook.
						</Text>
					</VStack>
				</ModalBody>
				<ModalFooter>
					<HStack>
						<Button
							colorScheme="red"
							variant="ghost"
							fontFamily={"Space Grotesk"}
							onClick={handleClose}
						>
							Cancel
						</Button>
					</HStack>
				</ModalFooter>
			</ModalContent>
		</Modal>
	);
};

export default QueryLimitModal;
