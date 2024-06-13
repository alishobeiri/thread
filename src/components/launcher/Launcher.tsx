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
					const newItems = Object.keys(kernelSpecs.kernelspecs)
						.filter(
							(key) => kernelSpecs.kernelspecs[key]?.display_name,
						)
						.map((key) => {
							return {
								label: kernelSpecs.kernelspecs[key]!
									.display_name,
								icon: kernelSpecs.kernelspecs[key]
									?.resources ? (
									<img
										src={
											kernelSpecs.kernelspecs[key]
												?.resources["logo-svg"]
										}
										alt={
											kernelSpecs.kernelspecs[key]!
												.display_name
										}
										height="36px"
										width="36px"
									/>
								) : (
									<PythonIcon boxSize={"36px"} />
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
							"https://github.com/squaredtechnologies/thread",
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
