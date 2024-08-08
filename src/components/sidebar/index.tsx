import {
	Box,
	HStack,
	IconButton,
	Tooltip,
	VStack,
	useColorModeValue,
} from "@chakra-ui/react";
import React, {
	JSXElementConstructor,
	ReactElement,
	ReactNode,
	useEffect,
} from "react";
import {
	ChatIcon,
	DiscordIcon,
	FolderIcon,
	GithubIcon,
	SettingsIcon,
} from "../../assets/icons";
import { useResizeWidth } from "../../hooks/useResizeWidth";
import {
	CHAT_PANEL_ID,
	FILESYSTEM_PANEL_ID,
	SETTINGS_PANEL_ID,
	TERMINAL_PANEL_ID,
} from "../../utils/constants/constants";
import ChatContent from "./panels/ChatContent";
import FileSystemContent from "./panels/FileSystemContent/FileSystemContent";
import SettingsContent from "./panels/SettingsContent";
import TerminalContent from "./panels/TerminalContent";
import {
	MAX_SIDEBAR_WIDTH,
	MIN_SIDEBAR_WIDTH,
	useSidebarStore,
} from "./store/SidebarStore";

type SidebarIconProps = {
	icon: ReactElement<any, string | JSXElementConstructor<any>> | undefined;
	isSelected?: boolean;
	label: string;
	title?: string;
	onClick?: () => void;
};

const SidebarTooltip: React.FC<{ label: string; children: ReactNode }> = ({
	label,
	children,
}) => {
	return (
		<Tooltip borderRadius={"md"} placement="right" label={label}>
			{children}
		</Tooltip>
	);
};
export const SidebarIcon = React.forwardRef(
	(
		{ icon, onClick, isSelected = false, label = "" }: SidebarIconProps,
		ref: React.Ref<HTMLButtonElement>,
	) => {
		const color = isSelected
			? "orange.500"
			: "var(--chakra-colors-chakra-body-text)";
		const selectedBgColor = useColorModeValue("gray.50", "");
		return (
			<SidebarTooltip label={label}>
				<IconButton
					icon={icon}
					fill={color}
					color={color}
					width="36px"
					height="36px"
					aria-label={label}
					size="sm"
					backgroundColor={isSelected ? selectedBgColor : "unset"}
					variant={isSelected ? "solid" : "ghost"}
					onClick={onClick}
				/>
			</SidebarTooltip>
		);
	},
);

interface SidebarPanelProps {
	panelType: string;
	handleCloseSidebar: () => void;
}

const SidebarPanel: React.FC<SidebarPanelProps> = ({
	panelType,
	handleCloseSidebar,
}) => {
	if (panelType === CHAT_PANEL_ID) {
		return <ChatContent handleCloseSidebar={handleCloseSidebar} />;
	} else if (panelType === FILESYSTEM_PANEL_ID) {
		return <FileSystemContent handleCloseSidebar={handleCloseSidebar} />;
	} else if (panelType === SETTINGS_PANEL_ID) {
		return <SettingsContent handleCloseSidebar={handleCloseSidebar} />;
	} else if (panelType === TERMINAL_PANEL_ID) {
		return <TerminalContent handleCloseSidebar={handleCloseSidebar} />;
	} else {
		return null;
	}
};

export default function Sidebar() {
	const bgColor = useColorModeValue(
		"var(--jp-layout-color2)",
		"var(--jp-layout-color1)",
	);
	const panelType = useSidebarStore((state) => state.panelType) ?? "chat";
	const isExpanded = useSidebarStore((state) => state.isExpanded);
	const sidebarWidth = useSidebarStore((state) => state.sidebarWidth);
	const setSidebarWidth = useSidebarStore((state) => state.setSidebarWidth);
	const handleMouseDown = useResizeWidth(
		sidebarWidth,
		setSidebarWidth,
		MIN_SIDEBAR_WIDTH,
		MAX_SIDEBAR_WIDTH,
	);

	const { setPanelType, setIsExpanded } = useSidebarStore.getState();

	useEffect(() => {
		useSidebarStore.getState().initializeSidebar();
	}, []);

	const handleSidebarIconClick = (type: string) => {
		// If this panel is already open, close the sidebar.
		if (isExpanded && panelType === type) {
			setIsExpanded(false);
			setPanelType("");
			return;
		}

		setIsExpanded(true);
		setPanelType(type);
	};

	const handleCloseSidebar = () => {
		setIsExpanded(false);
	};

	return (
		<HStack gap={0} height="100%">
			<Box
				width="48px"
				position="relative"
				outline="none"
				bg={bgColor}
				height="100%"
				p="2"
				fontFamily={"Space Grotesk"}
			>
				<VStack justifyContent={"space-between"} height="100%">
					<VStack spacing={2} align="center">
						<SidebarIcon
							icon={<FolderIcon />}
							isSelected={
								isExpanded && panelType === FILESYSTEM_PANEL_ID
							}
							onClick={() =>
								handleSidebarIconClick(FILESYSTEM_PANEL_ID)
							}
							label="Files"
						/>
						<SidebarIcon
							icon={<ChatIcon />}
							isSelected={
								isExpanded && panelType === CHAT_PANEL_ID
							}
							onClick={() =>
								handleSidebarIconClick(CHAT_PANEL_ID)
							}
							label="Chat"
						/>
					</VStack>
					<VStack>
						<SidebarIcon
							icon={<DiscordIcon boxSize="18px" />}
							label={"Join the Discord"}
							onClick={() =>
								window.open(
									"https://discord.gg/ZuHq9hDs2y",
									"_blank",
								)
							}
						/>
						<SidebarIcon
							icon={<GithubIcon boxSize="18px" />}
							label={"Raise an issue on GitHub"}
							onClick={() =>
								window.open(
									"https://github.com/squaredtechnologies/vizly-notebook/issues",
									"_blank",
								)
							}
						/>
						<SidebarIcon
							icon={<SettingsIcon />}
							isSelected={
								isExpanded && panelType === SETTINGS_PANEL_ID
							}
							label={"Settings"}
							onClick={() =>
								handleSidebarIconClick(SETTINGS_PANEL_ID)
							}
						/>
					</VStack>
				</VStack>
			</Box>
			{isExpanded && (
				<Box position={"relative"} display={"flex"} height="100%">
					<Box width={`${sidebarWidth}px`} height="100%">
						<SidebarPanel
							panelType={panelType}
							handleCloseSidebar={handleCloseSidebar}
						/>
						<Box
							onMouseDown={handleMouseDown}
							width="3px"
							_light={{
								bg: "blackAlpha.200",
								_hover: {
									bg: "blackAlpha.300",
								},
							}}
							_dark={{
								bg: "whiteAlpha.300",
								_hover: {
									bg: "whiteAlpha.400",
								},
							}}
							height="100%"
							position="absolute"
							right="0"
							top="0"
							cursor="col-resize"
							zIndex="10"
						/>
					</Box>
				</Box>
			)}
		</HStack>
	);
}
