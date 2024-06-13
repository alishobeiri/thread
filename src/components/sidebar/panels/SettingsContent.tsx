import { MoonIcon, SunIcon } from "@chakra-ui/icons";
import {
	HStack,
	Heading,
	IconButton,
	VStack,
	useColorMode,
	Box,
} from "@chakra-ui/react";
import { useColorModeValue } from "@chakra-ui/react";
import { KeyIcon, KeyboardIcon, ToggleSidebar } from "../../../assets/icons";
import { isPlatformMac } from "../../../utils/utils";
import { useShortcutsModalStore } from "../../modals/cheat-sheet/ShortcutsModalStore";
import { useServerSettingsModalStore } from "../../modals/server-settings/ServerSettingsModalStore";
import SidebarIcon from "../buttons/SidebarIcon";
import { ServerIcon } from "../../../assets/icons/svgs";

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
			<Box
				as="button"
				width="100%"
				padding={"12px"}
				_hover={{ backgroundColor: useColorModeValue("gray.100", "gray.700") }}
				onClick={handleServerSettingsOpen}
			>
				<HStack
					width="100%"
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
					<ServerIcon />
				</HStack>
			</Box>
			<Box
				as="button"
				width="100%"
				padding={"12px"}
				_hover={{ backgroundColor: useColorModeValue("gray.100", "gray.700") }}
				onClick={toggleColorMode}
			>
				<HStack
					width="100%"
					display={"flex"}
					flex="0 0 auto"
					justifyContent={"space-between"}
				>
					<Heading
						fontSize="smaller"
						fontWeight={"600"}
						fontFamily={"Space Grotesk"}
					>
						Theme
					</Heading>
					{colorMode === "light" ? <MoonIcon /> : <SunIcon />}
				</HStack>
			</Box>
			<Box
				as="button"
				width="100%"
				padding={"12px"}
				_hover={{ backgroundColor: useColorModeValue("gray.100", "gray.700") }}
				onClick={handleOpenShortcuts}
			>
				<HStack
					width="100%"
					display={"flex"}
					flex="0 0 auto"
					justifyContent={"space-between"}
				>
					<Heading
						fontSize="smaller"
						fontWeight={"600"}
						fontFamily={"Space Grotesk"}
					>
						Shortcuts
					</Heading>
					<KeyboardIcon />
				</HStack>
			</Box>
		</VStack>
	);
};

export default SettingsContent;