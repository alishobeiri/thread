import { AddIcon } from "@chakra-ui/icons";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	Button,
	HStack,
	Heading,
	IconButton,
	Link,
	Tooltip,
	VStack,
} from "@chakra-ui/react";
import { useRouter } from "next/router";
import {
	FolderIcon,
	RefreshIcon,
	ToggleSidebar,
} from "../../../../assets/icons";
import ConnectionManager from "../../../../services/connection/connectionManager";
import { VizlyNotebookFile } from "../../../../types/file.types";
import { isPlatformMac } from "../../../../utils/utils";
import Spinner from "../../../misc/Spinner";
import { useNotebookStore } from "../../../notebook/store/NotebookStore";

import SidebarIcon from "../../buttons/SidebarIcon";
import { FileRow } from "./FileRow";

const FilesPanel = ({
	handleDeleteItem,
	navigateToPath,
}: {
	handleDeleteItem: (file: VizlyNotebookFile) => Promise<void>;
	navigateToPath: (path: string) => void;
}) => {
	const router = useRouter();
	const path = useNotebookStore((state) => state.path);
	const files = useNotebookStore((state) => state.files);
	const { refreshFiles } = useNotebookStore.getState();

	const isFetchingFiles = useNotebookStore((state) => state.isFetchingFiles);

	return (
		<VStack
			width="100%"
			overflowY={"auto"}
			display={"flex"}
			flex="1"
			flexDirection={"column"}
			gap={0}
			height={"50%"}
		>
			<VStack w={"100%"} gap={0} padding={"12px"}>
				<HStack justify={"space-between"} width={"100%"}>
					<HStack>
						<Tooltip
							fontSize="small"
							hasArrow
							borderRadius={"sm"}
							placement="right"
							label={`Create a new notebook`}
						>
							<Button
								size="xs"
								variant={"ghost"}
								leftIcon={<AddIcon />}
								colorScheme="orange"
								fontFamily={"Space Grotesk"}
								onClick={() => {
									// Clearing the file contents will go to the launcher
									useNotebookStore
										.getState()
										.setFileContents(undefined);
									const { path, ...remainingQueries } =
										router.query;
									router.push({
										pathname: router.pathname,
										query: remainingQueries,
									});
								}}
							>
								New
							</Button>
						</Tooltip>
						<Tooltip
							fontSize="small"
							hasArrow
							borderRadius={"sm"}
							placement="top"
							label={`Refresh the file system.`}
						>
							<Button
								size="xs"
								colorScheme="orange"
								variant={"ghost"}
								leftIcon={<RefreshIcon />}
								onClick={() => {
									refreshFiles(path);
								}}
							>
								Refresh
							</Button>
						</Tooltip>
					</HStack>
				</HStack>
			</VStack>
			{path != "/" && (
				<HStack w={"100%"} p={"4px"} px={"12px"} overflowX={"auto"}>
					<Breadcrumb separator="/" fontSize={"xs"} w={"100%"}>
						<BreadcrumbItem key="home">
							<BreadcrumbLink
								size={"sm"}
								variant={"ghost"}
								aria-label="Home"
								as={IconButton}
								onClick={() => navigateToPath("/")}
								icon={<FolderIcon />}
								color={"orange.400"}
							/>
						</BreadcrumbItem>
						{path
							.split("/")
							.filter((i) => i !== "")
							.map((i, index, array) => {
								const isLastItem = index === array.length - 1;
								const currentPath = `/${array
									.slice(0, index + 1)
									.join("/")}`;
								return (
									<BreadcrumbItem
										key={i}
										isCurrentPage={isLastItem}
									>
										<BreadcrumbLink
											as={Link}
											onClick={() =>
												navigateToPath(currentPath)
											}
										>
											{i}
										</BreadcrumbLink>
									</BreadcrumbItem>
								);
							})}
					</Breadcrumb>
				</HStack>
			)}
			<VStack overflowY={"auto"} width="100%" gap={0.5}>
				{isFetchingFiles && files.length === 0 ? (
					<Spinner
						isSpinning={true}
						color="orange.500"
						size="md"
						mt="4"
					/>
				) : (
					(files as VizlyNotebookFile[]).map(
						(file: VizlyNotebookFile, i: number) => (
							<FileRow
								key={`${file.name}-${i}`}
								file={file}
								deleteItem={handleDeleteItem}
							/>
						),
					)
				)}
			</VStack>
		</VStack>
	);
};

export const FileSystemContent = ({
	handleCloseSidebar,
}: {
	handleCloseSidebar: () => void;
}) => {
	const { path, navigateToPath } = useNotebookStore.getState();
	const connectionManager = ConnectionManager.getInstance();

	const deleteItem = async (file: VizlyNotebookFile) => {
		try {
			await connectionManager.serviceManager!.contents.delete(file.path);
		} catch (error) {
			console.error("Error deleting item: ", error);
			return Promise.resolve();
		}

		navigateToPath(path);
	};

	return (
		<VStack width="100%" height="100%" gap={0}>
			<HStack
				width="100%"
				display={"flex"}
				flex="0 0 auto"
				justifyContent={"space-between"}
				px={"12px"}
				pt={"12px"}
				pb={"4px"}
			>
				<Heading fontSize="smaller" textTransform={"uppercase"}>
					Files
				</Heading>
				<SidebarIcon
					label={`Close sidebar (${
						isPlatformMac() ? "⌘ + B" : "Ctrl + B"
					})`}
					icon={<ToggleSidebar />}
					onClick={handleCloseSidebar}
				/>
			</HStack>
			<VStack
				width="100%"
				overflow="hidden"
				display={"flex"}
				flex="1"
				flexDirection={"column"}
				gap={0}
			>
				<FilesPanel
					handleDeleteItem={deleteItem}
					navigateToPath={navigateToPath}
				/>
			</VStack>
		</VStack>
	);
};

export default FileSystemContent;
