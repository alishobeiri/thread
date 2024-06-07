import { menuAnatomy, modalAnatomy, popoverAnatomy } from "@chakra-ui/anatomy";
import {
	createMultiStyleConfigHelpers,
	createStandaloneToast,
	extendTheme,
} from "@chakra-ui/react";
import { theme as ChakraUITheme } from "@chakra-ui/theme";
import "@fontsource/space-grotesk";
import "@fontsource/space-grotesk/300.css";
import "@fontsource/space-grotesk/400.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/space-grotesk/700.css";

const fonts = {};

const {
	definePartsStyle: definePartsStyleMenu,
	defineMultiStyleConfig: defineMultiStyleConfigMenu,
} = createMultiStyleConfigHelpers(menuAnatomy.keys);
const {
	definePartsStyle: definePartsStyleModal,
	defineMultiStyleConfig: defineMultiStyleConfigModal,
} = createMultiStyleConfigHelpers(modalAnatomy.keys);
const {
	definePartsStyle: definePartsStylePopover,
	defineMultiStyleConfig: defineMultiStyleConfigPopover,
} = createMultiStyleConfigHelpers(popoverAnatomy.keys);

const baseMenuStyle = definePartsStyleMenu({
	list: {
		fontSize: "small",
		zIndex: 10,
		bg: "var(--chakra-colors-chakra-body-bg)",
	},
	item: {
		bg: "var(--chakra-colors-chakra-body-bg)",
		// color: "gray.200",
		_hover: {
			bg: "var(--jp-layout-color2)",
		},
		_focus: {
			bg: "var(--jp-layout-color2)",
		},
	},
});

// export the base styles in the component theme
export const menuTheme = defineMultiStyleConfigMenu({
	baseStyle: baseMenuStyle,
});

const baseModalStyle = definePartsStyleModal({
	// define the part you're going to style
	overlay: {
		_dark: {
			bg: "whiteAlpha.400",
		},
		_light: {
			bg: `blackAlpha.400`,
		},
	},
	dialog: {
		borderRadius: "md",
		bg: "var(--chakra-colors-chakra-body-bg)",
	},
});

export const modalTheme = defineMultiStyleConfigModal({
	baseStyle: baseModalStyle,
});

const basePopoverStyle = definePartsStylePopover({
	content: {
		bg: "var(--chakra-colors-chakra-body-bg)",
		overflow: "hidden",
	},
	body: {
		bg: "var(--chakra-colors-chakra-body-bg)",
	},
	popper: {
		bg: "var(--chakra-colors-chakra-body-bg)",
	},
	header: {
		bg: "var(--chakra-colors-chakra-body-bg)",
	},
});

// export the base styles in the component theme
export const popoverTheme = defineMultiStyleConfigPopover({
	baseStyle: basePopoverStyle,
});

const config = {
	initialColorMode: "system",
	useSystemColorMode: false,
};

const components = {
	Button: {
		sizes: {
			xxs: {
				h: "16px",
				minW: "16px",
				fontSize: "8px",
				p: 2,
			},
		},
	},
	Menu: menuTheme,
	Modal: modalTheme,
	Popover: popoverTheme,
	Tooltip: {
		baseStyle: {
			fontFamily: "Space Grotesk",
		},
	},
};

const customGreen = {
	"50": "#F4FFF4",
	"100": "#E9FFE8",
	"200": "#D9FFD8",
	"300": "#C9FFC7",
	"400": "#A6FFA3",
	"500": "#7CF178",
	"600": "#51DA4C",
	"700": "#3FA93B",
	"800": "#2D712A",
	"900": "#193718",
};

const customRed = {
	50: "#FFF7F6",
	100: "#FFEDEB",
	200: "#FFE0DB",
	300: "#FFD3C9",
	400: "#FFB7A4",
	500: "#FF9574",
	600: "#FF6E3C",
	700: "#FF4500",
	800: "#AA2E00",
	900: "#541600",
};

const theme = extendTheme(
	{
		config,
		components,
		fonts,
		semanticTokens: {
			colors: {
				"chakra-body-bg": {
					// _light: "var(--jp-layout-color1)",
					// _dark: "var(--jp-layout-color0)",
					_light: "#fafafa",
					_dark: "#111",
				},
				"menu-bg": {
					_light: "white",
					// _dark: "var(--jp-layout-color0)",
					_dark: "#111",
				},
			},
		},
	},
	ChakraUITheme,
);

export default theme;

export const { ToastContainer, toast } = createStandaloneToast({ theme });

const defaultOptions = {
	status: "loading",
	containerStyle: {
		fontFamily: "Space Grotesk",
		backgroundColor: "transparent",
		marginBottom: "var(--chakra-space-5)",
	},
	position: "bottom",
	isClosable: true,
};

export const standaloneToast = new Proxy(toast, {
	apply(target, thisArg, argumentsList) {
		// If options are provided, merge them with defaultOptions
		if (argumentsList.length > 0 && typeof argumentsList[0] === "object") {
			argumentsList[0] = { ...defaultOptions, ...argumentsList[0] };
		} else {
			// If no options provided, use defaultOptions
			argumentsList = [defaultOptions];
		}
		``;

		return Reflect.apply(target, thisArg, argumentsList);
	},

	// Handle property access (like toast.close or toast.closeAll)
	get(target, prop, receiver) {
		return Reflect.get(target, prop, receiver);
	},
});
