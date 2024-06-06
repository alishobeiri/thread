import { useState, useEffect } from "react";
import { Box, Divider, HStack, Heading, Text, VStack } from "@chakra-ui/react";
import {
	DiscordIcon,
	GithubIcon,
	InfoIcon,
	JupyterIcon,
} from "../../assets/icons";
import { useNotebookStore } from "../notebook/store/NotebookStore";
import ConnectionManager from "../../services/connection/connectionManager";

const { createNewNotebook } = useNotebookStore.getState();

const Section = ({
	title,
	icon: SectionIcon,
	items,
}: {
	title: string;
	icon: any;
	items: { label: string; icon: any; actionHandler: () => void }[];
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
		</Box>
	);
};

const Launcher = () => {
	const [notebookItems, setNotebookItems] = useState<
		{ label: string; icon: JSX.Element; actionHandler: () => void }[]
	>([]);

	useEffect(() => {
		const fetchKernelSpecs = async () => {
			try {
				const connectionManager = ConnectionManager.getInstance();
				await connectionManager.ready;
				await connectionManager.serviceManager?.ready;
				const kernelSpecs = await connectionManager.serviceManager
					?.kernelspecs.specs;

				if (kernelSpecs) {
					const newItems = Object.keys(kernelSpecs.kernelspecs)
						.filter(
							(key) => kernelSpecs.kernelspecs[key]?.display_name,
						)
						.map((key) => ({
							label: kernelSpecs.kernelspecs[key]!.display_name,
							icon: (
								<img
									src={`${kernelSpecs.kernelspecs[key]?.resources["logo-svg"]}`}
									alt={
										kernelSpecs.kernelspecs[key]!
											.display_name
									}
									height="36px"
									width="36px"
								/>
							),
							actionHandler: () => {
								createNewNotebook(key);
							},
						}));
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
			title: "Notebook",
			icon: <JupyterIcon boxSize={"18px"} />,
			items:
				notebookItems.length > 0
					? notebookItems
					: [
							{
								label: "No kernels could be found.",
								icon: null,
								actionHandler: () => {},
							},
					  ],
		},
		{
			title: "Join the community",
			icon: <InfoIcon />,
			items: [
				{
					label: "GitHub",
					icon: <GithubIcon boxSize={"36px"} />,
					actionHandler: () =>
						window.open(
							"https://github.com/squaredtechnologies/thread/issues",
							"_blank",
						),
				},
				{
					label: "Discord",
					icon: <DiscordIcon boxSize={"36px"} />,
					actionHandler: () =>
						window.open("https://discord.gg/gkB2sWu8", "_blank"),
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
				/>
			))}
		</VStack>
	);
};

export default Launcher;
