import { Box, IconButton, Tooltip, useColorModeValue } from "@chakra-ui/react";
import React, { JSXElementConstructor, ReactElement, ReactNode } from "react";
import { useSidebarStore } from "../store/SidebarStore";

export const SidebarTooltip: React.FC<{
	label: string;
	children: ReactNode;
}> = ({ label, children }) => {
	return (
		<Tooltip
			fontFamily={"Space Grotesk"}
			borderRadius={"md"}
			placement="right"
			label={label}
			fontSize="small"
		>
			{children}
		</Tooltip>
	);
};

const SidebarIcon = React.forwardRef(
	(
		{
			icon,
			onClick,
			isSelected = false,
			label = "",
			size = "sm",
			...props
		}: {
			icon:
				| ReactElement<any, string | JSXElementConstructor<any>>
				| undefined;
			isSelected?: boolean;
			label: string;
			size?: string;
			title?: string;
			onClick?: () => void;
		},
		ref,
	) => {
		const expanded = useSidebarStore((state) => state.isExpanded);
		const selectedBgColor = useColorModeValue("gray.50", "");
		const color = isSelected
			? "orange.500"
			: "var(--chakra-colors-chakra-body-text)";
		const bgColor = isSelected ? selectedBgColor : "unset";

		return (
			<SidebarTooltip label={label}>
				<IconButton
					icon={icon}
					colorScheme="orange"
					fill={color}
					color={color}
					aria-label={label}
					size={size}
					backgroundColor={bgColor}
					variant={isSelected ? "solid" : "ghost"}
					onClick={onClick}
				>
					<Box
						display={expanded ? "block" : "none"}
						transition="display 0.2s ease-in-out"
					>
						{label}
					</Box>
				</IconButton>
			</SidebarTooltip>
		);
	},
);
SidebarIcon.displayName = "SidebarIcon";

export default SidebarIcon;
