import { Box, Divider, HStack, Heading, Text, VStack } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import {
	DiscordIcon,
	GithubIcon,
	InfoIcon,
	JupyterIcon,
	PlusIcon,
	PythonIcon,
} from "../../assets/icons";
import ConnectionManager from "../../services/connection/connectionManager";
import { useNotebookStore } from "../notebook/store/NotebookStore";

const { createNewNotebook } = useNotebookStore.getState();

// Component to handle kernel logo with fallback
const KernelLogo = ({
	logoUrl,
	alt,
	fallback,
}: {
	logoUrl: string | undefined | null;
	alt: string;
	fallback: JSX.Element;
}) => {
	const [hasError, setHasError] = useState(false);

	if (!logoUrl || hasError) {
		return fallback;
	}

	return (
		<img
			src={logoUrl}
			alt={alt}
			height="36px"
			width="36px"
			onError={() => {
				console.warn(`Failed to load logo: ${logoUrl}`);
				setHasError(true);
			}}
		/>
	);
};

const Section = ({
	title,
	icon: SectionIcon,
	items,
	fallbackMessage,
}: {
	title: string;
	icon: any;
	items: { label: string; icon: any; actionHandler: () => void }[];
	fallbackMessage?: string;
}) => {
	return (
		<Box width="100%">
			<HStack>
				{SectionIcon}
				<Heading fontSize="larger" fontFamily={"Space Grotesk"}>
					{title}
				</Heading>
			</HStack>
			<Divider my={2} />
			{items.length > 0 ? (
				<HStack direction="row" gap={4} wrap="wrap">
					{items.map((item, index) => (
						<VStack
							gap={0}
							key={index}
							cursor={"pointer"}
							tabIndex={0}
							border="1px"
							_light={{ borderColor: "gray.200" }}
							_dark={{
								borderColor: "gray.600",
								_hover: {
									borderColor: "gray.300",
								},
							}}
							transition={"all 0.2s"}
							borderRadius="md"
							width="128px"
							height="128px"
							display="flex"
							flexDirection="column"
							alignItems="center"
							boxShadow="sm"
							_hover={{ boxShadow: "md" }}
							onClick={item.actionHandler}
						>
							<Box
								width="100%"
								flexGrow={1}
								display="flex"
								alignItems="center"
								justifyContent="center"
							>
								{item.icon}
							</Box>
							<Box
								title={item.label}
								width="100%"
								height="36px"
								display="flex"
								alignItems="center"
								justifyContent="center"
								overflow="hidden"
								px={2}
								fontWeight={"semibold"}
								fontFamily={"Space Grotesk"}
								fontSize={"small"}
							>
								<Text isTruncated>{item.label}</Text>
							</Box>
						</VStack>
					))}
				</HStack>
			) : (
				<Heading
					py={3}
					fontSize="lg"
					fontFamily={"Space Grotesk"}
					color={"orange.500"}
				>
					{fallbackMessage}
				</Heading>
			)}
		</Box>
	);
};

const Launcher = () => {
	const [notebookItems, setNotebookItems] = useState<
		{ label: string; icon: JSX.Element; actionHandler: () => void }[]
	>([]);
	const files = useNotebookStore((state) => state.files);
	const existingNotebooks = files.filter((file) => file.type === "notebook");

	useEffect(() => {
		const fetchKernelSpecs = async () => {
			try {
				const connectionManager = ConnectionManager.getInstance();
				await connectionManager.ready;
				await connectionManager.serviceManager?.ready;
				const kernelSpecs = await connectionManager.serviceManager
					?.kernelspecs.specs;

				if (kernelSpecs) {
					// Debug: Print kernelspecs structure
					console.log("Kernelspecs data:", kernelSpecs);
					console.log("Kernelspecs keys:", Object.keys(kernelSpecs.kernelspecs));
					
					// Get the Jupyter server URL from ConnectionManager
					const serverUrl = connectionManager.serverUrl || "http://127.0.0.1:8888";
					const urlParams = new URLSearchParams(window.location.search);
					const token = urlParams.get("token") || "123";
					
					const newItems = Object.keys(kernelSpecs.kernelspecs)
						.filter(
							(key) => kernelSpecs.kernelspecs[key]?.display_name,
						)
						.map((key) => {
							const kernel = kernelSpecs.kernelspecs[key];
							// Debug: Print each kernel's data
							console.log(`Kernel ${key}:`, {
								display_name: kernel?.display_name,
								resources: kernel?.resources,
								logo_svg: kernel?.resources?.["logo-svg"],
							});
							
							let logoUrl = kernel?.resources?.["logo-svg"];
							
							// Transform relative logo URLs to absolute URLs using the Jupyter server URL
							// Convert /kernelspecs/... to http://127.0.0.1:8888/kernelspecs/...
							if (logoUrl && logoUrl.startsWith("/")) {
								logoUrl = `${serverUrl}${logoUrl}?token=${token}`;
							}
							
							return {
								label: kernel!.display_name,
								icon: (
									<KernelLogo
										logoUrl={logoUrl}
										alt={kernel!.display_name}
										fallback={<PythonIcon boxSize={"36px"} />}
									/>
								),
								actionHandler: () => {
									createNewNotebook(key);
								},
							};
						});
					setNotebookItems(newItems);
				} else {
					console.error("Failed to fetch kernelspecs");
				}
			} catch (error) {
				console.error("Error fetching kernelspecs:", error);
			}
		};

		fetchKernelSpecs();
	}, []);

	const sections = [
		{
			title: "New notebook",
			icon: <PlusIcon boxSize={"18px"} />,
			items: notebookItems,
			fallbackMessage: "No kernels could be found",
		},
		...(existingNotebooks && existingNotebooks.length > 0
			? [
					{
						title: "Notebooks in directory",
						icon: <JupyterIcon boxSize={"18px"} />,
						items: existingNotebooks.map((notebook) => ({
							label: notebook.name,
							icon: <JupyterIcon boxSize={"36px"} />,
							actionHandler: () => {
								useNotebookStore
									.getState()
									.handleNotebookClick(notebook);
							},
						})),
					},
			  ]
			: []),
		{
			title: "Join the community",
			icon: <InfoIcon />,
			items: [
				{
					label: "GitHub",
					icon: <GithubIcon boxSize={"36px"} />,
					actionHandler: () =>
						window.open(
							"https://github.com/alishobeiri/thread",
							"_blank",
						),
				},
				{
					label: "Discord",
					icon: <DiscordIcon boxSize={"36px"} />,
					actionHandler: () =>
						window.open("https://discord.gg/ZuHq9hDs2y", "_blank"),
				},
			],
		},
	];

	return (
		<VStack width="85%" paddingY="24" gap={12} alignItems={"flex-start"}>
			{sections.map((section, index) => (
				<Section
					key={index}
					title={section.title}
					icon={section.icon}
					items={section.items}
					fallbackMessage={section.fallbackMessage}
				/>
			))}
		</VStack>
	);
};

export default Launcher;
