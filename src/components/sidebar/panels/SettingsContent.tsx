import { MoonIcon, SunIcon } from "@chakra-ui/icons";
import {
	Box,
	HStack,
	Heading,
	IconButton,
	VStack,
	useColorMode,
} from "@chakra-ui/react";
import { KeyboardIcon, ToggleSidebar } from "../../../assets/icons";
import { SIDEPANEL_WIDTH } from "../../../utils/constants/constants";
import { isPlatformMac } from "../../../utils/utils";
import { useShortcutsModalStore } from "../../modals/cheat-sheet/ShortcutsModalStore";
import SidebarIcon from "../buttons/SidebarIcon";

export const ThemeToggle = () => {
	const { colorMode, toggleColorMode } = useColorMode();
	return (
		<IconButton
			icon={colorMode === "light" ? <MoonIcon /> : <SunIcon />}
			onClick={toggleColorMode}
			variant="ghost"
			aria-label="Toggle theme"
		/>
	);
};

export const SettingsContent = ({
	handleCloseSidebar,
}: {
	handleCloseSidebar: () => void;
}) => {
	const { setShowShortcutsModal } = useShortcutsModalStore.getState();
	const handleOpenShortcuts = () => {
		setShowShortcutsModal(true);
	};
	return (
		<Box
			width={`${SIDEPANEL_WIDTH}px`}
			height="100%"
			borderRight="1px solid var(--chakra-colors-chakra-border-color)"
			fontFamily={"Space Grotesk"}
		>
			<VStack width="100%" height="100%" gap={0}>
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
						label={`Close Sidebar (${
							isPlatformMac() ? "⌘ + B" : "Ctrl + B"
						})`}
						icon={<ToggleSidebar />}
						onClick={handleCloseSidebar}
					/>
				</HStack>
				<HStack
					width="100%"
					display={"flex"}
					flex="0 0 auto"
					justifyContent={"space-between"}
					padding={"12px"}
				>
					<Heading fontSize="smaller" fontWeight={"600"}>
						Theme
					</Heading>
					<ThemeToggle />
				</HStack>
				<HStack
					width="100%"
					display={"flex"}
					flex="0 0 auto"
					justifyContent={"space-between"}
					padding={"12px"}
				>
					<Heading fontSize="smaller" fontWeight={"600"}>
						Shortcuts
					</Heading>
					<IconButton
						variant={"ghost"}
						icon={<KeyboardIcon />}
						aria-label="Keyboard shortcuts"
						size="md"
						onClick={handleOpenShortcuts}
					/>
				</HStack>
			</VStack>
		</Box>
	);
};

export default SettingsContent;
