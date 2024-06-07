import React, { useRef, useState } from "react";
import {
	AlertDialog,
	AlertDialogBody,
	AlertDialogContent,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogOverlay,
	Button,
} from "@chakra-ui/react";

export const KernelWarningModal = ({
	isOpen,
	onClose,
	onContinue,
}: {
	isOpen: boolean;
	onClose: () => void;
	onContinue: () => void;
}) => {
	const [dontShowAgain, setDontShowAgain] = useState(false); // State to track checkbox
	const cancelRef = useRef<HTMLButtonElement | null>(null);

	const handleCheckboxChange = () => {
		setDontShowAgain(!dontShowAgain);
		localStorage.setItem(
			"showRunningKernelWarning",
			JSON.stringify(!dontShowAgain),
		);
	};

	return (
		<>
			<AlertDialog
				isOpen={isOpen}
				leastDestructiveRef={cancelRef}
				onClose={onClose}
			>
				<AlertDialogOverlay>
					<AlertDialogContent>
						<AlertDialogHeader fontSize="lg" fontWeight="bold">
							Running Kernel Warning
						</AlertDialogHeader>

						<AlertDialogBody>
							Your Notebook&apos;s kernel is currently running and
							will be stopped when you navigate away.
						</AlertDialogBody>

						<AlertDialogFooter>
							<Button ref={cancelRef} onClick={onClose}>
								Cancel
							</Button>

							<Button
								colorScheme="orange"
								onClick={onContinue}
								ml={3}
							>
								Continue
							</Button>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialogOverlay>
			</AlertDialog>
		</>
	);
};

export default KernelWarningModal;
