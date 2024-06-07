import {
	Button,
	HStack,
	IconButton,
	Text,
	Tooltip,
	useBreakpointValue,
} from "@chakra-ui/react";

import { useRouter } from "next/router";
import { useEffect, useState } from "react";

import {
	CircleIcon,
	CloudSaveIcon,
	PythonIcon,
	RefreshIcon,
} from "../../assets/icons";
import ConnectionManager, {
	useConnectionManagerStore,
} from "../../services/connection/connectionManager";

import { trackClickEvent } from "../../utils/posthog";
import { useNotebookStore } from "../notebook/store/NotebookStore";

export const SaveIndicator = () => {
	const isSaving = useNotebookStore((state) => state.isSaving);
	const [showText, setShowText] = useState(true);

	const Icon = isSaving ? RefreshIcon : CloudSaveIcon;
	const text = isSaving ? "Saving..." : "Saved";

	useEffect(() => {
		const handleBeforeUnload = (event: BeforeUnloadEvent) => {
			if (isSaving) {
				// Customize the message as per your requirement
				const message = "Changes may not be saved.";
				event.returnValue = message; // Standard for most browsers
				return message; // For some older browsers
			}
		};

		window.addEventListener("beforeunload", handleBeforeUnload);

		return () => {
			window.removeEventListener("beforeunload", handleBeforeUnload);
		};
	}, [isSaving]);

	return (
		<Button
			size="xs"
			variant="ghost"
			backgroundColor="var(--chakra-colors-chakra-body-bg)"
			leftIcon={<Icon />}
			height="100%"
			borderRadius={"none"}
			fontWeight={500}
			color="var(--jp-ui-font-color1)"
			iconSpacing={showText ? 2 : 0}
			onClick={() => {
				trackClickEvent("[StatusBar] Handle Save");
				const { handleSave } = useNotebookStore.getState();
				handleSave();
			}}
		>
			{showText && <Text>{text}</Text>}
		</Button>
	);
};

const StatusBar = () => {
	// This will return 'base' on smaller screens and 'md' on larger screens
	const showExtra = useBreakpointValue({ base: false, md: true });

	return (
		<HStack
			height="30px"
			width={"100%"}
			borderTop="1px solid var(--chakra-colors-chakra-border-color)"
			justifyContent={"space-between"}
			alignItems="center"
			px="12px"
			fontFamily={"Space Grotesk"}
		>
			<HStack height="100%">
				<SaveIndicator />
			</HStack>
			<HStack height="100%">
				{showExtra && <EnvironmentSpecifications />}
				<KernelStatus />
			</HStack>
		</HStack>
	);
};

const EnvironmentSpecifications = () => {
	return (
		<HStack height="100%">
			<Tooltip
				fontSize="small"
				hasArrow
				borderRadius={"sm"}
				placement="top"
				label={`Using Python v3.11`}
			>
				<Button
					aria-label="Kernel Status"
					size="xs"
					height="100%"
					borderRadius="none"
					leftIcon={<PythonIcon boxSize={"9px"} />}
					variant="ghost"
				>
					Python 3.11
				</Button>
			</Tooltip>
		</HStack>
	);
};

export const KernelStatus = () => {
	const kernelStatus = useConnectionManagerStore(
		(state) => state.kernelStatus,
	);

	const [indicatorMessage, setIndicatorMessage] = useState("");
	const [indicatorColor, setIndicatorColor] = useState("red");

	useEffect(() => {
		switch (kernelStatus) {
			case "unknown":
				setIndicatorColor("var(--chakra-colors-gray-500)");
				setIndicatorMessage("Kernel status is unknown.");
				break;
			case "starting":
				setIndicatorColor("var(--chakra-colors-yellow-500)");
				setIndicatorMessage("Kernel is starting up");
				break;
			case "idle":
			case "busy":
				setIndicatorColor("var(--chakra-colors-green-500)");
				setIndicatorMessage("Kernel is connected");
				break;
			case "terminating":
				setIndicatorColor("var(--chakra-colors-red-500)");
				setIndicatorMessage("Kernel is restarting");
				break;
			case "restarting":
				setIndicatorColor("var(--chakra-colors-orange-500)");
				setIndicatorMessage("Kernel is restarting");
				break;
			case "autorestarting":
				setIndicatorColor("var(--chakra-colors-cyan-500)");
				setIndicatorMessage("Kernel is auto-restarting");
				break;
			case "dead":
				setIndicatorColor("var(--chakra-colors-red-500)");
				setIndicatorMessage("Kernel is restarting");
				break;
			default:
				setIndicatorColor("var(--chakra-colors-white-500)");
				setIndicatorMessage("Kernel status is unknown.");
				break;
		}
	}, [kernelStatus]);

	return (
		<HStack height="100%">
			<Tooltip
				hasArrow
				borderRadius={"sm"}
				placement="top"
				label={indicatorMessage}
				fontFamily={"Space Grotesk"}
				textAlign={"center"}
			>
				<IconButton
					fontFamily="Space Grotesk"
					aria-label="Kernel Status"
					size="sm"
					icon={<CircleIcon />}
					variant="ghost"
					color={indicatorColor}
				/>
			</Tooltip>
			<Tooltip
				fontSize="small"
				hasArrow
				borderRadius={"sm"}
				placement={"left-start"}
				label={"Restart the notebook and clear all variables"}
			>
				<Button
					size="xs"
					height="100%"
					borderRadius="none"
					leftIcon={<RefreshIcon />}
					variant="ghost"
					color="var(--jp-ui-font-color1)"
					onClick={() => {
						trackClickEvent("[StatusBar] Restart Kernel");
						ConnectionManager.getInstance()
							.restartKernel()
							.then(() => {
								useNotebookStore
									.getState()
									.resetExecutionCounts();
							});
					}}
				>
					Restart kernel
				</Button>
			</Tooltip>
		</HStack>
	);
};

export default StatusBar;
