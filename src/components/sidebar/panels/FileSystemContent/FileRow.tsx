import { Icon } from "@chakra-ui/icon";
import {
	useColorModeValue,
	VStack,
	HStack,
	Tooltip,
	Menu,
	MenuButton,
	Button,
	MenuList,
	MenuItem,
	Text,
} from "@chakra-ui/react";
import {
	FileIcon,
	FolderIcon,
	JupyterIcon,
	PythonIcon,
	ThreeDotsVerticalIcon,
	TrashCanIcon,
} from "../../../../assets/icons";
import { ThreadFile } from "../../../../types/file.types";
import { getFileName } from "../../../../utils/utils";
import { useRouter } from "next/router";
import { useNotebookStore } from "../../../notebook/store/NotebookStore";
import { useFileViewModalState } from "../../../modals/file-view/FileViewModalStore";

export const FileRow = ({
	file,
	deleteItem,
}: {
	file: ThreadFile;
	deleteItem: (file: ThreadFile) => Promise<void>;
}) => {
	const router = useRouter();
	const { navigateToPath } = useNotebookStore.getState();
	const selectedFileBgColor = useColorModeValue("orange.100", "orange.800");

	const fileName = getFileName(file);
	const fileSelected = fileName == router.query.path;

	const fetchIcon = (file: ThreadFile) => {
		if (file.type === "directory") {
			return <Icon as={FolderIcon} color="orange.300" />;
		} else if (file.type === "notebook") {
			return <Icon as={JupyterIcon} color="orange.300" />;
		}
		return <Icon as={FileIcon} color="orange.300" />;
	};

	const onClick = () => {
		if (file.type == "notebook") {
			router.push({
				pathname: router.pathname,
				query: {
					...router.query,
					path: file.path,
				},
			});
		} else if (file.type == "directory") {
			navigateToPath(file.path);
		} else {
			useFileViewModalState.getState().setFile(file);
		}
	};

	return (
		<VStack
			w={"100%"}
			alignItems="center"
			justifyContent="space-between"
			py="0"
			px="12px"
			bg={fileSelected ? selectedFileBgColor : "transparent"}
			onClick={onClick}
			cursor={"pointer"}
			fontFamily={"Space Grotesk"}
		>
			<HStack w={"100%"} justifyContent={"space-between"} fontSize={"md"}>
				<HStack
					width="100%"
					flex={1}
					alignItems={"center"}
					justifyContent={"flex-start"}
					fontWeight={"semibold"}
					maxWidth="70%"
					fontSize={"smaller"}
				>
					{fetchIcon(file)}
					<Tooltip label={fileName}>
						<Text isTruncated>{fileName}</Text>
					</Tooltip>
				</HStack>
				<MoreOptionsMenu file={file} deleteItem={deleteItem} />
			</HStack>
		</VStack>
	);
};

const MoreOptionsMenu = ({
	file,
	deleteItem,
}: {
	file: ThreadFile;
	deleteItem: (file: ThreadFile) => void;
}) => {
	return (
		<Menu>
			<MenuButton
				as={Button}
				variant="ghost"
				colorScheme="orange"
				size="xs"
				m={0}
				p={0}
				onClick={(e) => e.stopPropagation()}
			>
				<Icon as={ThreeDotsVerticalIcon} color="gray.500" />
			</MenuButton>
			<MenuList>
				<MenuItem
					onClick={(event) => {
						event.stopPropagation();
						deleteItem(file);
					}}
					icon={<TrashCanIcon />}
					color="red"
				>
					<Text>Delete</Text>
				</MenuItem>
			</MenuList>
		</Menu>
	);
};
