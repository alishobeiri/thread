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
import { useInvalidConnectionModalStore } from "./InvalidConnectionStore";

const InvalidConnectionModal = () => {
	const isOpen = useInvalidConnectionModalStore(
		(state) => state.showInvalidConnection,
	);
	const setIsOpen = useInvalidConnectionModalStore(
		(state) => state.setShowInvalidConnectionModal,
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
							Connection Error
						</Heading>
					</VStack>
					<VStack width="100%" gap={6} alignItems={"flex-start"}>
						<Text>
							Your device was not able to connect to the proxy.
							Please reach out to{" "}
							<Text
								as={Link}
								href="mailto:ali@vizlylabs.com"
								color="orange.400"
							>
								ali@vizlylabs.com
							</Text>{" "}
							for more information.
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

export default InvalidConnectionModal;
