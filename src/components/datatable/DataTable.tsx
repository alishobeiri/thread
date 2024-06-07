import { DownloadIcon } from "@chakra-ui/icons";
import {
	Box,
	Button,
	HStack,
	Table,
	TableContainer,
	Tbody,
	Thead,
	Tooltip,
	Tr,
	VStack,
} from "@chakra-ui/react";
import {
	createColumnHelper,
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { CSVLink } from "react-csv";
import { newUuid } from "../../utils/utils";

const columnHelper = createColumnHelper();

export type TableData = {
	columns: string[];
	rows: string[][];
	caption?: string | null;
};

export type DataTableProps = {
	data: TableData;
	// columns: any;
	height?: number | string;
	message?: string;
	showDownloadButton?: boolean;
};

const ROW_HEIGHT = 20;

const CellWithPopover = ({
	cell,
	isLeftmost,
}: {
	cell: any;
	isLeftmost: boolean;
}) => {
	const [isTooltipVisible, setIsTooltipVisible] = useState(false);
	const value = cell.getValue("Cell");
	const textRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if (textRef.current) {
			const textWidth = textRef.current.scrollWidth;
			// Check if parentNode is an instance of HTMLElement before accessing offsetWidth
			if (textRef.current.parentNode instanceof HTMLElement) {
				const parentWidth = textRef.current.parentNode.offsetWidth;
				setIsTooltipVisible(textWidth > parentWidth);
			}
		}
	}, [textRef, value]);

	return (
		<Box
			as={isLeftmost ? "th" : "td"}
			w={cell.column.getSize()}
			overflow="hidden"
			textOverflow="ellipsis"
			borderRight={"1px solid var(--jp-layout-color3)"}
			borderBottom={"1px solid var(--jp-layout-color3)"}
			fontSize="13px"
			verticalAlign="middle"
			borderLeft={
				isLeftmost ? "1px solid var(--jp-layout-color3)" : "none"
			}
			_hover={{
				boxShadow: "inset 0 0 0 1.5px var(--chakra-colors-orange-500)",
			}}
			cursor={"pointer"}
		>
			{isTooltipVisible && (
				<Tooltip label={value}>
					<Box p={"4px 6px"} ref={textRef}>
						{value}
					</Box>
				</Tooltip>
			)}
			{!isTooltipVisible && (
				<Box p={"4px 6px"} ref={textRef}>
					{value}
				</Box>
			)}
		</Box>
	);
};

const Row = ({ table, index }: { table: any; index: number }) => {
	const row = table.getRowModel().rows[index];

	return (
		<Tr
			key={row.id}
			height={`${ROW_HEIGHT}px`}
			style={{
				verticalAlign: "middle",
			}}
			_hover={{ backgroundColor: "var(--jp-layout-color2)" }}
		>
			{row.getVisibleCells().map((cell: any) => {
				return (
					<CellWithPopover
						key={`cell-${cell.id}`}
						cell={cell}
						isLeftmost={cell.id === row.getVisibleCells()[0].id}
					/>
				);
			})}
		</Tr>
	);
};

// todo: stats are being loaded in rn locally - should figure out way to flow through here
export function DataTable({
	data = {
		columns: [],
		rows: [],
	},
	showDownloadButton = true,
	height,
}: DataTableProps) {
	const columns = useMemo(() => {
		// Fallback to a default set of columns if none are provided
		if (data.columns.length === 0 && data.rows.length > 0) {
			// Assuming all rows have the same number of elements,
			// create a set of generic column headers like "Column 1", "Column 2", etc.
			return Array.from({ length: data.rows[0].length }, (_, index) => ({
				...columnHelper.accessor((row: any) => row[index], {
					header: `Column ${index + 1}`,
				}),
				id: `column_${index}`,
			}));
		}

		return data.columns.map((columnName, index) => ({
			...columnHelper.accessor((row: any) => row[index], {
				header: columnName,
			}),
			id: `${columnName}_${index}`,
		}));
	}, [data]);

	const table = useReactTable({
		columns,
		data: data.rows,
		columnResizeMode: "onChange",
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
	});

	const handlePreventScrollingPage = (e: any) => {
		e.stopPropagation();
	};

	return (
		<VStack gap={0} position="relative">
			<TableContainer
				as={"div"}
				onWheelCapture={handlePreventScrollingPage}
				overscrollBehaviorX={"contain"}
				margin="0 auto"
				overflowY={"auto"}
				background="var(--chakra-colors-chakra-body-bg)"
				width={"100%"}
				fontFamily={"Space Grotesk"}
			>
				<Table as="table" colorScheme="orange">
					{data.caption && ( // Check if caption exists and render it
						<caption
							style={{
								captionSide: "top", // Position the caption at the top of the table
								textAlign: "center", // Center-align the caption text
								padding: "8px", // Add some padding for better appearance
								fontSize: "12px", // Adjust font size as needed
								fontWeight: "bold", // Make the caption text bold
							}}
						>
							{data.caption}
						</caption>
					)}
					<Thead position="sticky" top={0} zIndex="0">
						{data.columns.length > 0 &&
							table.getHeaderGroups().map((headerGroup) => (
								<Tr key={headerGroup.id}>
									{headerGroup.headers.map((header) => {
										const headerName = header.column
											.columnDef.header as string;

										// see https://tanstack.com/table/v8/docs/api/core/column-def#meta to type this correctly
										const meta: any =
											header.column.columnDef.meta;

										// TODO: make it such that the sort element still shown (and not chopped off by width limit)
										return (
											<motion.th
												key={header.column.columnDef.id}
												style={{
													position: "relative",
													fontSize: "12px",
													padding: 0,
													border: "1px solid var(--jp-layout-color3)",
													backgroundColor:
														"var(--jp-layout-color2)",
													width: header.getSize(),
													textOverflow: "ellipsis",
													whiteSpace: "nowrap",
													overflow: "hidden",
													height: `${ROW_HEIGHT}px`,
												}}
											>
												<Box p={"4px 6px"}>
													<VStack
														display="flex"
														gap={0}
														alignItems="flex-start"
													>
														<Box
															fontWeight={700}
															title={
																headerName as string
															}
															style={{
																whiteSpace:
																	"nowrap",
																overflow:
																	"hidden",
																textOverflow:
																	"ellipsis",
															}}
														>
															{flexRender(
																headerName,
																header.getContext(),
															)}
														</Box>
													</VStack>
												</Box>
												<Box
													onMouseDown={header.getResizeHandler()}
													onTouchStart={header.getResizeHandler()}
													className={`table-column-resizer ${
														header.column.getIsResizing()
															? "isResizing"
															: ""
													}`}
												/>
											</motion.th>
										);
									})}
								</Tr>
							))}
					</Thead>
					<Tbody>
						{table.getRowModel().rows.map((row, i) => (
							<Row key={`row-${i}`} index={i} table={table} />
						))}
					</Tbody>
				</Table>
			</TableContainer>
		</VStack>
	);
}
