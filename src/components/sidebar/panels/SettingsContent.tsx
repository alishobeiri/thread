import { MoonIcon, SunIcon } from "@chakra-ui/icons";
import {
	HStack,
	Heading,
	VStack,
	useColorMode,
	useColorModeValue,
} from "@chakra-ui/react";
import { KeyboardIcon, ToggleSidebar } from "../../../assets/icons";
import { ServerIcon } from "../../../assets/icons/svgs";
import { isPlatformMac } from "../../../utils/utils";
import { useShortcutsModalStore } from "../../modals/cheat-sheet/ShortcutsModalStore";
import { useServerSettingsModalStore } from "../../modals/server-settings/ServerSettingsModalStore";
import SidebarIcon from "../buttons/SidebarIcon";

export const SettingsContent = ({
	handleCloseSidebar,
}: {
	handleCloseSidebar: () => void;
}) => {
	const { colorMode, toggleColorMode } = useColorMode();
	const { setShowShortcutsModal } = useShortcutsModalStore.getState();
	const handleOpenShortcuts = () => {
		setShowShortcutsModal(true);
	};

	const hoverBackgroundColor = useColorModeValue("gray.100", "gray.700");
	const hoverStyles = {
		background: hoverBackgroundColor,
	};

	const handleServerSettingsOpen = () => {
		useServerSettingsModalStore.getState().setShowServerSettingsModal(true);
	};

	return (
		<VStack width="100%" height="100%" gap={3}>
			<HStack
				width="100%"
				display={"flex"}
				flex="0 0 auto"
				justifyContent={"space-between"}
				padding={"12px"}
			>
				<Heading
					fontSize="smaller"
					textTransform={"uppercase"}
					fontFamily={"Space Grotesk"}
				>
					Settings
				</Heading>
				<SidebarIcon
					label={`Close sidebar (${
						isPlatformMac() ? "⌘ + B" : "Ctrl + B"
					})`}
					icon={<ToggleSidebar />}
					onClick={handleCloseSidebar}
				/>
			</HStack>
			<VStack width="100%" gap={2}>
				<HStack
					as={"button"}
					width="100%"
					padding={"12px"}
					_hover={hoverStyles}
					onClick={handleServerSettingsOpen}
					display={"flex"}
					flex="0 0 auto"
					justifyContent={"space-between"}
				>
					<Heading
						fontSize="smaller"
						fontWeight={"600"}
						fontFamily={"Space Grotesk"}
					>
						Server Settings
					</Heading>
					<ServerIcon mr={2} boxSize="15px" />
				</HStack>
				<HStack
					as="button"
					width="100%"
					padding={"12px"}
					_hover={hoverStyles}
					display={"flex"}
					flex="0 0 auto"
					justifyContent={"space-between"}
					onClick={toggleColorMode}
				>
					<Heading
						fontSize="smaller"
						fontWeight={"600"}
						fontFamily={"Space Grotesk"}
					>
						Theme
					</Heading>
					{colorMode === "light" ? (
						<MoonIcon mr={2} boxSize="15px" />
					) : (
						<SunIcon mr={2} boxSize="15px" />
					)}
				</HStack>
				<HStack
					as="button"
					width="100%"
					padding={"12px"}
					_hover={hoverStyles}
					display={"flex"}
					flex="0 0 auto"
					justifyContent={"space-between"}
					onClick={handleOpenShortcuts}
				>
					<Heading
						fontSize="smaller"
						fontWeight={"600"}
						fontFamily={"Space Grotesk"}
					>
						Shortcuts
					</Heading>
					<KeyboardIcon mr={2} boxSize="15px" />
				</HStack>
			</VStack>
		</VStack>
	);
};

export default SettingsContent;
