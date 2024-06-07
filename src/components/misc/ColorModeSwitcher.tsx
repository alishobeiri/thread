import { MoonIcon, SunIcon } from "@chakra-ui/icons";
import { IconButton, Tooltip, useColorMode } from "@chakra-ui/react";

export const ThemeToggle = ({ size = "sm" }: { size?: "sm" | "md" | "lg" }) => {
	const { colorMode, toggleColorMode } = useColorMode();
	return (
		<Tooltip
			fontSize="small"
			borderRadius={"md"}
			placement="right"
			label={`Switch to ${colorMode === "light" ? "dark" : "light"} mode`}
			fontFamily={"Space Grotesk"}
		>
			<IconButton
				colorScheme="orange"
				icon={colorMode === "light" ? <MoonIcon /> : <SunIcon />}
				onClick={toggleColorMode}
				variant="ghost"
				aria-label="Toggle theme"
				size={size}
			/>
		</Tooltip>
	);
};
