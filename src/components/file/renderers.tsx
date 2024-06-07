import {
	Box,
	HStack,
	Tab,
	TabList,
	TabPanel,
	TabPanels,
	Tabs,
	Text,
	useColorModeValue,
} from "@chakra-ui/react";
import { JSONTree } from "react-json-tree";
import Spinner from "../misc/Spinner";
import CrazyTable from "../modals/file-view/CrazyTable";
import {
	APPLICATION_JSON,
	APPLICATION_PDF,
	EXCEL_MIME_TYPE,
	SPREADHSEET_MIME_TYPE,
	TEXT_CSV,
} from "../cell/output/mimeTypes";

export interface TransformData {
	columns: string[];
	rows: any[][];
}

export interface TableState {
	data: Record<string, any>[];
	columns: string[];
}

export interface ExcelPreviewState {
	[sheetName: string]: TableState;
}

export type JsonPreviewState = string;

export type PreviewData = {
	type: string;
	data?: TableState | ExcelPreviewState | JsonPreviewState;
};

const RenderCSVData = ({ previewData }: { previewData: TableState }) => {
	return <CrazyTable data={previewData.data} columns={previewData.columns} />;
};

const RenderJSONData = ({ previewData }: { previewData: JsonPreviewState }) => {
	const theme = useColorModeValue(
		{
			scheme: "monokai",
			base00: "var(--chakra-colors-chakra-body-bg)",
		},
		{
			base00: "var(--chakra-colors-chakra-body-bg)",
			base01: "#383c4a",
			base02: "#4b5363",
			base03: "#646e82",
			base04: "#b2bcc9",
			base05: "#e5e9f0",
			base06: "#eff1f5",
			base07: "#abb2bf",
			base08: "#e06c75",
			base09: "#d19a66",
			base0A: "#e5c07b",
			base0B: "#98c379",
			base0C: "#56b6c2",
			base0D: "#61afef",
			base0E: "#c678dd",
			base0F: "#be5046",
		},
	);

	return (
		<Box maxHeight={"500px"} overflow={"auto"} fontFamily={"Space Grotesk"}>
			<Text fontSize={"sm"} fontFamily={"Space Grotesk"}>
				Previewing structure of JSON file.
			</Text>
			<JSONTree theme={theme} data={JSON.parse(previewData)} />
		</Box>
	);
};

const RenderExcelData = ({
	previewData,
	height = "500px",
}: {
	previewData: ExcelPreviewState;
	height?: string;
}) => {
	return (
		<Tabs
			variant="enclosed-colored"
			colorScheme="orange"
			isLazy
			align="start"
			orientation="horizontal"
			size="sm"
			direction="rtl"
		>
			<Box>
				<TabPanels>
					{Object.entries(previewData).map(
						([sheetName, sheetData], index) => (
							<TabPanel
								key={index}
								paddingTop="4"
								p={0}
								pb={1}
								height={height}
							>
								<CrazyTable
									data={sheetData.data}
									columns={sheetData.columns}
								/>
							</TabPanel>
						),
					)}
				</TabPanels>
			</Box>
			<TabList fontFamily={"Space Grotesk"}>
				{Object.keys(previewData).map((sheetName, index) => (
					<Tab key={index}>{sheetName}</Tab>
				))}
			</TabList>
		</Tabs>
	);
};

export const FilePreview = ({ previewData }: { previewData: PreviewData }) => {
	if (!previewData) {
		return (
			<HStack gap={3}>
				<Spinner isSpinning color="orange.400" />
				<Text fontFamily={"Space Grotesk"}>Loading file...</Text>
			</HStack>
		);
	}

	const couldNotGeneratePreview = (
		<Text fontStyle="italic" color="orange.400">
			Could not generate preview for this file
		</Text>
	);

	if (previewData && !previewData.data) {
		return couldNotGeneratePreview;
	}

	switch (previewData.type) {
		case TEXT_CSV:
			return (
				<Box height="500px">
					<RenderCSVData
						previewData={previewData.data as TableState}
					/>
				</Box>
			);
		case APPLICATION_JSON:
			return (
				<RenderJSONData
					previewData={previewData.data as JsonPreviewState}
				/>
			);
		case SPREADHSEET_MIME_TYPE:
		case EXCEL_MIME_TYPE:
			return (
				<RenderExcelData
					height="500px"
					previewData={previewData.data as ExcelPreviewState}
				/>
			);
		default:
			return couldNotGeneratePreview;
	}
};
