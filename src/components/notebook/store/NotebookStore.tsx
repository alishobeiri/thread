import { ICell, IMarkdownCell, IOutput } from "@jupyterlab/nbformat";
import { PartialJSONObject } from "@lumino/coreutils/types";
import { captureException } from "@sentry/nextjs";
import { NextRouter } from "next/router";
import { v4 as uuidv4 } from "uuid";
import { temporal } from "zundo";
import { create } from "zustand";
import useApiCallStore from "../../../hooks/useApiCallStore";
import ConnectionManager, {
	useConnectionManagerStore,
} from "../../../services/connection/connectionManager";
import { standaloneToast } from "../../../theme";
import { ThreadCell } from "../../../types/code.types";
import {
	NotebookFile,
	NotebookMetadata,
	ThreadFile,
} from "../../../types/file.types";
import { magicQuery } from "../../../utils/magic/magicQuery";
import { trackEventData } from "../../../utils/posthog";
import { newUuid } from "../../../utils/utils";
import { enableCommandMode } from "../../cell/actions/actions";
import { refresh } from "../../sidebar/filesystem/FileSystemToolbarUtils";
import debounce from "lodash.debounce";
export type ICellTypes = "markdown" | "code" | "rawNB";
export type NotebookMode = "command" | "edit";
export type ExecutionCountTypes = number | null;

export interface MarkdownCell extends IMarkdownCell {
	rendered: boolean;
	cell_type: "markdown";
}

export const createNewCell = (): ICell => ({
	id: uuidv4(),
	cell_type: "code",
	source: "",
	outputs: [],
	metadata: {},
	execution_count: null,
});

const debounceFn = debounce(async (fn: () => Promise<void>) => {
	await fn();
}, 2000);

export interface INotebookStore {
	files: ThreadFile[];

	path: string;
	setPath: (path: string) => void;

	router: NextRouter;
	setRouter: (router: NextRouter) => void;

	selectedNotebook: NotebookFile;
	isFetchingNotebooks: boolean;
	isFetchingFiles: boolean;
	filesBeingUploaded: ThreadFile[];
	setIsFetchingNotebooks: (isFetching: boolean) => void;
	setIsFetchingFiles: (isFetching: boolean) => void;
	setNotebooks: (notebooks: ThreadFile[]) => void;
	refreshFiles: (path?: string, silent?: boolean) => Promise<ThreadFile[]>;
	deleteFile: (file: ThreadFile, router?: NextRouter) => Promise<void>;
	downloadFile: (file: ThreadFile) => Promise<void>;
	setFiles: (files: ThreadFile[]) => void;
	setSelectedNotebook: (notebook: NotebookFile | undefined) => void;

	fileContents: NotebookFile | undefined;
	setFileContents: (fileContents: NotebookFile | undefined) => void;
	getFileContents: () => NotebookFile | undefined;

	getNotebookPath: (notebook?: NotebookFile) => string;
	getNotebookName: () => string | undefined;
	setNotebookName: (
		newName: string,
	) => Promise<{ success: boolean; error: string | null }>;
	setNotebookSettings: () => Promise<void>;

	setNotebookId: (id: string) => void;
	getNotebookId: (notebook?: NotebookFile) => string;

	setSessionId: (id: string) => void;
	getSessionId: () => string | undefined;

	setKernelId: (id: string) => void;
	getKernelId: () => string | undefined;

	cells: ThreadCell[];
	metadata: NotebookMetadata;

	// Cell related functions
	setCells: (newCells: ICell[]) => void;
	addCell: (source?: string, type?: ICellTypes) => ICell;
	addCellAtIndex: (
		index: number,
		source?: string,
		type?: ICellTypes,
		mode?: NotebookMode,
		group?: string,
		user?: "user" | "assistant",
		action?: string,
	) => ICell;
	setCellSource: (cellId: string, newSource: string) => void;
	setCellUser: (cellId: string, user: "user" | "assistant") => void;
	setActiveCellSource: (newSource: string) => void;
	deleteCell: (cellId: string) => void;
	deleteActiveCell: () => void;
	setCellType: (cellId: string, newType: ICellTypes) => void;
	setCellGroup: (id: string, group: string) => void;
	setCellOutputs: (cellId: string, newOutputs: IOutput[]) => void;
	addCellOutput: (cellId: string, newOutput: IOutput) => void;
	moveCell: (direction: "up" | "down") => void;
	resetState: () => void;
	clearNotebook: () => void;
	clearCellOutputs: (cellId: string) => void;
	resetExecutionCounts: () => void;
	setExecutionCount: (cellId: string, count: ExecutionCountTypes) => void;
	getActiveCell: () => ICell;
	setActiveCell: (cellId: string) => void;
	clampIndex: (index: number, max?: number) => number;
	getCellIndexById: (id: string) => number;

	isGeneratingCells: boolean;
	addedGeneratedCell: boolean;
	userAbortedMagicQueryController: AbortController;
	abortMagicQuery: () => void;
	magicQuery: (prompt: string) => void;

	activeCellIndex: number;
	notebookMode: NotebookMode;

	setNotebookMode: (newType: NotebookMode) => void;
	setMarkdownCellRendered: (cellId: string, rendered: boolean) => void;
	executeAllCells: () => void;
	executeSelectedCells: () => void;
	executeCell: (cellId: string) => void;
	executeSelectedCellsAndAdvance: () => void;

	isLoadingNotebook: boolean;
	createNewNotebook: (kernelSelection?: string) => void;
	selectNotebook: (
		notebook: NotebookFile,
		kernelSelection?: string,
	) => NotebookFile;
	handleNotebookClick: (notebook: ThreadFile) => Promise<void>;
	navigateToPath: (path: string) => void;
	handleSave: () => void;
	isSaving: boolean;
	lastSaveTime: number;

	currentExecutingCell: string;
	executingCells: Set<string>;
	addExecutingCell: (cellId: string) => void;
	removeExecutingCell: (cellId: string) => void;
	setExecutingCells: (cellIds: string[]) => void;
	setCurrentlyExecutingCell: (cellId: string | undefined) => void;
}

export const useNotebookStore = create<INotebookStore>()(
	temporal(
		(set, get) =>
			({
				path: "/",
				notebooks: [],
				files: [],
				selectedNotebook: undefined,
				isFetchingNotebooks: false,
				isGeneratingCells: false,

				// There is a delay between when generation starts and when a cell is added to the notebook
				addedGeneratedCell: false,
				refreshFiles: (path: string, silent: boolean = false) => {
					const { setFiles, setPath } = get();

					if (!silent) {
						set({ isFetchingFiles: true });
					}
					return refresh(path)
						.then((contents) => {
							setPath(path);
							if (!contents) {
								return [] as ThreadFile[];
							}
							if (!contents.sort) {
								console.log(contents);
							}
							const sortedContent = contents.sort((a, b) => {
								// First, sort by type
								const typeComparison = a.type.localeCompare(
									b.type,
								);

								if (typeComparison !== 0) {
									return typeComparison;
								}

								// If types are the same, then sort by name
								return a.name.localeCompare(b.name);
							});

							setFiles(sortedContent as ThreadFile[]);

							return sortedContent;
						})
						.catch((error) => {
							captureException(error);
							console.error(
								"Ran into error while navigating to path: ",
								error,
							);
							return [] as ThreadFile[];
						})
						.finally(() => {
							if (!silent) {
								set({ isFetchingFiles: false });
							}
						});
				},
				deleteFile: async (file: ThreadFile) => {
					const { path } = get();

					const isFile = "last_modified" in file;
					trackEventData(
						isFile
							? "[Files] Deleting File"
							: "[Files] Deleting Notebook",
					);
					try {
						const connectionManager =
							ConnectionManager.getInstance();
						await connectionManager.serviceManager!.contents.delete(
							file.name,
						);

						get().refreshFiles(path);

						standaloneToast({
							title: "File deleted",
							description: `This file (${file.name}) has been deleted.`,
							status: "success",
							duration: 5000,
							isClosable: true,
						});
					} catch (error) {
						console.error("Error deleting item: ", error);
						return Promise.resolve();
					} finally {
						get().refreshFiles(path, true);
					}
				},
				setFiles: (files: ThreadFile[]) => set({ files: files }),
				setSelectedNotebook: (notebook: NotebookFile) =>
					set({
						selectedNotebook: notebook,
						isLoadingNotebook: false,
					}),
				cells: [],
				notebookMode: "command",
				activeCellIndex: 0,
				executingCells: new Set(),
				fileContents: undefined,
				metadata: {},

				setPath: (path: string) => set({ path: path }),
				setFileContents: (fileContents: NotebookFile) => {
					if (!fileContents) {
						set({ fileContents: undefined, cells: [] });
						return;
					}

					const cells = fileContents.cells ? fileContents.cells : [];
					if (cells.length == 0) {
						set({
							fileContents: fileContents,
							cells: [createNewCell()],
							metadata: {
								...fileContents.metadata,
							},
							activeCellIndex: 0,
						});
					} else {
						let notebookMode = "edit" as NotebookMode;
						const cells = fileContents?.cells ?? [];

						// If the first cell is markdown, begin the notebook in command mode. This allows for first markdown cell to be rendered
						if (
							cells &&
							cells.length > 0 &&
							cells[0].cell_type === "markdown"
						) {
							notebookMode = "command";
						}

						set({
							fileContents: fileContents,
							cells: cells.map((cell) => {
								let user = "assistant";
								if (cell.cell_type === "markdown") {
									get().setMarkdownCellRendered(
										cell.id as string,
										true,
									);
								}

								return {
									...cell,
									id: cell.id ?? newUuid(),
									metadata: {
										...cell.metadata,
										thread: {
											...(cell.metadata
												.thread as PartialJSONObject),
											ran: false,
											user: user,
										},
									},
								};
							}),
							metadata: {
								...fileContents.metadata,
							},
							activeCellIndex: 0,
							notebookMode: notebookMode,
						});
					}
				},
				getFileContents: () => {
					const fileContents = get().fileContents;

					const cells = get().cells;
					const metadata = get().metadata;

					if (!fileContents) {
						return undefined;
					}
					fileContents.cells = cells;
					fileContents.metadata = metadata;

					return fileContents as NotebookFile;
				},
				setCellGroup: (id: string, group: string) => {
					const { cells } = get();
					const index = cells.findIndex((cell) => cell.id === id);
					if (index === -1) {
						return;
					}

					set((state) => {
						// Clone the cells array
						const updatedCells = [...state.cells];

						// Update the code of the cell at the specified index
						updatedCells[index] = {
							...updatedCells[index],
							metadata: {
								...updatedCells[index],
								thread: {
									group,
								},
							},
						};

						// Return the updated state
						return {
							cells: updatedCells,
						};
					});
					get().handleSave();
				},
				getNotebookName: () => {
					const path = get().getNotebookPath();
					if (!path) {
						return undefined;
					}
					return path.split("/").pop();
				},
				setNotebookName: async (newName: string) => {
					return ConnectionManager.getInstance()
						.renameFile(get().getNotebookPath(), newName)
						.then((result) => {
							get().refreshFiles(get().path);
							return result;
						});
				},
				getNotebookId: (notebook?: NotebookFile) => {
					// Returns the current notebook's ID (if it exists) or the provided notebook's ID if provided
					console.log("getNotebookById");
					console.log(notebook);
					console.log(get().selectedNotebook);
					return "123";
				},
				setNotebookId: (notebookId: string) => {
					const metadata = get().metadata;
					if (!metadata || !metadata.thread) {
						return;
					}

					set((state) => ({
						metadata: {
							...state.metadata,
							thread: {
								...metadata.thread,
								id: notebookId,
							},
						},
					}));

					// Save the notebook to save the ID after it is set
					get().handleSave();
				},
				setSessionId: (id: string) => {
					const { metadata } = get();
					set({
						metadata: {
							...metadata,
							thread: {
								...metadata.thread,
								sessionId: id,
							},
						},
					});
				},
				getSessionId: () => {
					let sessionId;
					const { metadata } = get().metadata;
					if (metadata && metadata.thread) {
						sessionId = metadata.thread.sessionId;
					}
					return sessionId;
				},
				setKernelId: (id: string) => {
					const { metadata } = get();
					set({
						metadata: {
							...metadata,
							thread: {
								...metadata.thread,
								kernelId: id,
							},
						},
					});
				},
				getKernelId: () => {
					let kernelId;
					const { metadata } = get().metadata;
					if (metadata && metadata.thread) {
						kernelId = metadata.thread.kernelId;
					}
					return kernelId;
				},
				getNotebookPath: () => {
					const { router } = get();
					if (router) {
						return get().router.query.path;
					}
					return "";
				},
				clampIndex: (index: number, max?: number) => {
					return Math.min(
						Math.max(index, 0),
						max ?? get().cells.length - 1,
					);
				},
				getCellIndexById: (id: string) => {
					const { cells } = get();
					const cellIndex = cells.findIndex((cell) => cell.id === id);
					return cellIndex === -1 ? 0 : cellIndex;
				},

				userAbortedMagicQueryController: new AbortController(),
				abortMagicQuery: () => {
					get().userAbortedMagicQueryController.abort();
					// Interrupt code execution if running
					ConnectionManager.getInstance().kernel?.interrupt();
				},
				magicQuery: async (prompt: string) => {
					// Reset the abort controller right away
					set({
						isGeneratingCells: true,
						userAbortedMagicQueryController: new AbortController(),
					});

					trackEventData("[MagicQuery] submitted");

					const shouldContinue = useApiCallStore
						.getState()
						.checkAndIncrementApiCallCount();

					if (!shouldContinue) {
						return;
					}

					try {
						await magicQuery(prompt);
					} catch (e: any) {
						console.error(e);
					} finally {
						set({
							isGeneratingCells: false,
							addedGeneratedCell: false,
						});
					}
				},
				setCellSource: (cellId: string, newSource: string) => {
					const index = get().getCellIndexById(cellId);
					if (index === -1) {
						return;
					}

					set((state) => {
						// Clone the cells array
						const updatedCells = [...state.cells];

						// Update the code of the cell at the specified index
						updatedCells[index] = {
							...updatedCells[index],
							source: newSource,
						};

						// Return the updated state
						return {
							cells: updatedCells,
						};
					});
					get().handleSave();
				},
				setCellUser: (cellId: string, user: "user" | "assistant") => {
					const index = get().getCellIndexById(cellId);
					if (index === -1) {
						return;
					}

					set((state) => {
						// Clone the cells array
						const updatedCells = [...state.cells];

						// Update the user of the cell at the specified index
						updatedCells[index] = {
							...updatedCells[index],
							metadata: {
								thread: {
									...updatedCells[index].metadata.thread,
									user,
								},
							},
						};

						// Return the updated state
						return {
							cells: updatedCells,
						};
					});
					get().handleSave();
				},
				setActiveCellSource: (newSource: string) => {
					const activeCellIndex = get().activeCellIndex;
					const cell = get().cells[activeCellIndex];
					const prevSource = cell.source as string;
					if (newSource == prevSource) {
						// Since we recreate the cells, it causes a full re-render
						// don't re-render unless the cell source changes
						return;
					}

					set((state) => {
						const cells = [...state.cells];
						// update active cell's source with newSource
						cells[activeCellIndex] = {
							...cells[activeCellIndex],
							source: newSource,
						};

						return {
							cells,
						};
					});
					get().handleSave();
				},
				deleteCell: (cellId: string) => {
					const cells = [...get().cells];
					let index = get().getCellIndexById(cellId);

					trackEventData("[NOTEBOOK] delete cell");

					if (cells.length === 1) {
						const newCell = createNewCell();

						set(() => ({
							cells: [newCell],
							activeCellIndex: index,
						}));
						return;
					} else {
						cells.splice(index, 1);

						// handles case for deleting the last cell
						if (index === cells.length) index -= 1;
						set(() => ({
							cells: cells,
							activeCellIndex: index,
						}));
					}
					get().handleSave();
				},
				deleteActiveCell: () => {
					const activeCellIndex = get().activeCellIndex;
					const cells = [...get().cells];
					const clampedIndex = get().clampIndex(
						activeCellIndex,
						Math.max(0, cells.length - 2),
					);

					if (cells.length === 1) {
						const newCell = createNewCell();

						set(() => ({
							cells: [newCell],
							activeCellIndex: clampedIndex,
						}));
					} else {
						cells.splice(activeCellIndex, 1);
						set(() => ({
							cells: cells,
							activeCellIndex: clampedIndex,
						}));
					}
					get().handleSave();
				},
				setCellType: (cellId: string, newType: ICellTypes) => {
					const index = get().getCellIndexById(cellId);
					if (index == -1) {
						return;
					}

					set((state) => {
						// Clone the cells array
						const updatedCells = [...state.cells];

						if (newType === "markdown") {
							delete updatedCells[index]["outputs"];
							delete updatedCells[index]["execution_count"];
						}

						// Update the code of the cell at the specified index
						updatedCells[index] = {
							...updatedCells[index],
							cell_type: newType,
						};

						// Return the updated state
						return {
							cells: updatedCells,
						};
					});
				},
				setCellOutputs: (cellId: string, newOutputs: IOutput[]) => {
					const index = get().getCellIndexById(cellId);
					if (index == -1) {
						return;
					}
					const cell = get().cells[index];
					if (cell.cell_type == "markdown") {
						// Don't set output on markdown cells otherwise will fail verification
						return;
					}
					set((state) => {
						// Clone the cells array
						const updatedCells = [...state.cells];

						// Update the code of the cell at the specified index
						updatedCells[index] = {
							...updatedCells[index],
							outputs: newOutputs,
						};

						// Return the updated state
						return {
							cells: updatedCells,
						};
					});
				},
				addCellOutput: (cellId: string, newOutput: IOutput) => {
					const index = get().getCellIndexById(cellId);
					if (index === -1) {
						return;
					}
					set((state) => {
						// Clone the cells array
						const updatedCells = [...state.cells];

						// Update the code of the cell at the specified index
						updatedCells[index] = {
							...updatedCells[index],
							outputs: [
								...(updatedCells[index].outputs as IOutput[]),
								newOutput,
							],
						};

						// Return the updated state
						return {
							cells: updatedCells,
						};
					});

					get().handleSave();
				},
				resetExecutionCounts: () => {
					set((state) => {
						// Clone the cells array
						const updatedCells = [...state.cells];
						return {
							cells: updatedCells.map((cell) => {
								return {
									...cell,
									execution_count: null,
								};
							}),
						};
					});
				},
				setExecutionCount: (
					cellId: string,
					count: ExecutionCountTypes,
				) => {
					const index = get().getCellIndexById(cellId);
					if (index == -1) {
						return;
					}

					set((state) => {
						// Clone the cells array
						const updatedCells = [...state.cells];

						// Update the code of the cell at the specified index
						updatedCells[index] = {
							...updatedCells[index],
							execution_count: count,
						};

						// Return the updated state
						return {
							cells: updatedCells,
						};
					});
				},
				getActiveCell: () => {
					return get().cells[get().clampIndex(get().activeCellIndex)];
				},
				setActiveCell: (cellId: string) => {
					set((state) => {
						const indexToSet = state.getCellIndexById(cellId);
						return {
							activeCellIndex: indexToSet,
						};
					});
				},
				resetState: () => {
					get().abortMagicQuery();
					set(() => ({
						cells: [],
						activeCellIndex: 0,
						fileContents: undefined,
						metadata: {} as NotebookMetadata,
						selectedNotebook: undefined,
					}));
				},
				clearNotebook: () => {
					set(() => ({
						cells: [createNewCell()],
						activeCellIndex: 0,
					}));
					get().handleSave();
				},
				clearCellOutputs: (cellId: string) => {
					const index = get().getCellIndexById(cellId);
					if (index === -1) {
						return;
					}
					set((state) => {
						// Clone the cells array
						const updatedCells = [...state.cells];

						// Update the code of the cell at the specified index
						updatedCells[index] = {
							...updatedCells[index],
							outputs: [],
						};

						// Return the updated state
						return {
							cells: updatedCells,
						};
					});
					get().handleSave();
				},
				addCell: (source?: string, type?: ICellTypes) => {
					let newCell: ICell | MarkdownCell;

					if (type === "markdown") {
						newCell = {
							...createNewCell(),
							source: source || "",
							cell_type: "markdown",
							metadata: {
								...createNewCell().metadata,
								rendered: false,
							},
						};
					} else {
						newCell = {
							...createNewCell(),
							source: source || "",
							cell_type: type || "code",
						};
					}

					trackEventData("[NOTEBOOK] Added cell", {
						cellType: newCell.cell_type,
					});

					set((state) => {
						const newCells = [...state.cells, newCell];

						return {
							cells: newCells,
							activeCellIndex: newCells.length - 1,
						};
					});

					return newCell;
				},
				moveCell: (direction: "up" | "down") => {
					const { cells, activeCellIndex } = get();

					if (direction === "up") {
						if (activeCellIndex > 0) {
							[
								cells[activeCellIndex],
								cells[activeCellIndex - 1],
							] = [
								cells[activeCellIndex - 1],
								cells[activeCellIndex],
							];
							set((state) => ({
								...state,
								activeCellIndex: activeCellIndex - 1,
							}));
						}
					} else if (direction === "down") {
						if (activeCellIndex < cells.length - 1) {
							[
								cells[activeCellIndex],
								cells[activeCellIndex + 1],
							] = [
								cells[activeCellIndex + 1],
								cells[activeCellIndex],
							];
							set((state) => ({
								...state,
								activeCellIndex: activeCellIndex + 1,
							}));
						}
					}
				},
				addCellAtIndex: (
					index: number,
					source?: string,
					type?: ICellTypes,
					mode: NotebookMode = "command",
					group: string | undefined = undefined,
					user: "user" | "assistant" = "assistant",
					action: string | undefined = undefined,
				) => {
					if (
						type != "code" &&
						type != "markdown" &&
						type != "rawNB" &&
						type != undefined
					) {
						// Do not allow another type of string to be defined
						type = "markdown";
					}

					const newCell: ICell = {
						...createNewCell(),
						source: source || "",
						cell_type: type || "code",
						metadata: {
							thread: {
								group: group || undefined,
								user,
								action: action,
							},
						},
					};

					// Splice edits the array inplace
					const newCells = [
						...get().cells.map((cell) => ({ ...cell })),
					];
					newCells.splice(index, 0, newCell);
					trackEventData("[NOTEBOOK] Added cell at index", {
						cellType: newCell.cell_type,
						index: index,
					});

					set(() => ({
						cells: newCells,
						activeCellIndex: index,
						notebookMode: mode,
					}));

					return newCell;
				},
				setCells: (newCells: ICell[]) => {
					if (newCells.length == 0) {
						set({ cells: [] });
						get().addCell();
						return;
					}
					set({ cells: newCells });
				},
				setNotebookMode: (newType: NotebookMode) => {
					set({ notebookMode: newType });
				},
				setMarkdownCellRendered: (
					cellId: string,
					rendered: boolean,
				) => {
					// update markdown cell to rendered: true
					set((state) => {
						const newCells = [...state.cells];
						if (newCells.length == 0) {
							return { cells: newCells };
						}
						const cellIndex = state.getCellIndexById(cellId);

						const markdownCellToExecute = {
							...newCells[cellIndex],
						} as MarkdownCell;

						markdownCellToExecute.metadata.rendered = rendered;
						newCells[cellIndex] = markdownCellToExecute;

						return { cells: newCells };
					});
				},
				executeAllCells: async () => {
					trackEventData("[NOTEBOOK] Execute all cells", {
						cellLength: get().cells.length,
					});
					get().cells.map((cell, _) => {
						get().executeCell(cell.id as string);
					});
				},
				executeSelectedCells: () => {
					const activeCellIndex = get().activeCellIndex;
					const cell = get().cells[activeCellIndex];
					get().executeCell(cell.id as string);
				},
				executeCell: (cellId: string) => {
					const connectionManager = ConnectionManager.getInstance();
					const {
						getCellIndexById,
						refreshFiles,
						cells,
						executingCells,
						path,
					} = get();

					const index = getCellIndexById(cellId);
					const cell = cells[index];
					const { cell_type, source, outputs } = cell;

					if (!connectionManager || !connectionManager.kernel) {
						useConnectionManagerStore
							.getState()
							.openKernelSelectionModal();
					}

					const alreadyExecuting = executingCells.has(cellId);
					if (alreadyExecuting) {
						// Debounce multiple requests to execute
						console.warn(
							"Tried to execute an already executing cell",
						);
						return Promise.resolve();
					}

					trackEventData("[NOTEBOOK] Cell executed");

					// TODO: Run the active cell, add the ability to run selected cells soon
					// Only call the kernel if the code is non-empty (or there's an output that can be cleared).
					if (
						cell_type === "code" &&
						(source.length > 0 || (outputs as IOutput[]).length > 0)
					) {
						return connectionManager.kernel
							?.execute([cellId])
							.then(() => {
								// Refresh the files after each execution
								refreshFiles(path, true);
							});
					} else if (cell_type === "markdown") {
						const { setMarkdownCellRendered } = get();
						setMarkdownCellRendered(cellId, true);
						enableCommandMode();
						return Promise.resolve();
					}

					return Promise.resolve();
				},
				executeSelectedCellsAndAdvance: () => {
					const { cells, activeCellIndex } = get();
					// Run the current cell add proceed to the next (or create a new one).
					get().executeSelectedCells();

					trackEventData("[NOTEBOOK] execute cell and advance");

					// If this is the last cell, add a new one.
					if (activeCellIndex === cells.length - 1) {
						get().addCellAtIndex(activeCellIndex + 1);
					}
					set({
						activeCellIndex: activeCellIndex + 1,
					});
				},
				setCurrentlyExecutingCell: (cellId: string | undefined) => {
					set({
						currentExecutingCell: cellId,
					});
				},
				setRouter: (router: NextRouter) => {
					set({ router: router });
				},

				isLoadingNotebook: false,
				createNewNotebook: async (kernelSelection?: string) => {
					const { router } = get();

					trackEventData("[NOTEBOOK] create new notebook");

					try {
						const connectionManager =
							ConnectionManager.getInstance();
						await connectionManager.ready;
						const newNotebook =
							await connectionManager.serviceManager!.contents.newUntitled(
								{
									type: "notebook",
									path: get().path,
								},
							);
						const fileContent =
							await connectionManager.getFileContents(
								newNotebook.path,
							);

						router.push({
							pathname: router.pathname,
							query: {
								...router.query,
								path: newNotebook.path,
								kernelSelection: kernelSelection,
							},
						});
						return fileContent.content;
					} catch (error) {
						console.log(error);
						standaloneToast({
							title: "Error creating new notebook",
							status: "error",
							duration: 3000,
							isClosable: true,
						});
						return;
					} finally {
						get().refreshFiles(get().path);
					}
				},
				selectNotebook: (
					notebook: NotebookFile,
					kernelSelection?: string,
				): NotebookFile => {
					set({ isLoadingNotebook: true });
					trackEventData("[NOTEBOOK] selectedNotebook");

					const { setSelectedNotebook, setFileContents } = get();

					setFileContents(notebook);
					setSelectedNotebook(notebook);
					set({ isLoadingNotebook: false });

					ConnectionManager.getInstance().connectToKernelForNotebook({
						kernelSelection,
						sessionId: notebook.metadata?.thread?.sessionId,
					});

					const router = get().router;
					const routerKernel = router.query.kernelSelection;
					if (kernelSelection && routerKernel === kernelSelection) {
						// Remove the kernel selection after it has been consumed once
						const { kernelSelection, ...updatedQuery } =
							router.query;
						router.push({
							pathname: router.pathname,
							query: updatedQuery,
						});
					}

					return notebook;
				},
				handleNotebookClick: async (notebookFile: ThreadFile) => {
					const { selectNotebook, router } = get();

					useNotebookStore.setState({
						isLoadingNotebook: true,
					});

					const path = notebookFile.path;
					const routerPath = router.query.path;
					const kernelSelection = router.query
						.kernelSelection as string;
					if (routerPath !== path) {
						router.push({
							pathname: router.pathname,
							query: {
								...router.query,
								path: path,
							},
						});
					}

					const notebookContents =
						await ConnectionManager.getInstance().getFileContents(
							path as string,
						);

					selectNotebook(
						notebookContents.content as NotebookFile,
						kernelSelection,
					);

					useNotebookStore.setState({
						isLoadingNotebook: false,
					});
				},
				navigateToPath: (path: string) => {
					const { refreshFiles } = get();
					refreshFiles(path);
				},
				handleSave: async () => {
					const saveNotebook = async () => {
						const notebookPath = await get().getNotebookPath();
						const connectionManager =
							ConnectionManager.getInstance();
						if (
							!notebookPath ||
							!connectionManager ||
							!connectionManager.serviceManager
						) {
							return;
						}

						const fileContents = get().getFileContents();
						if (!fileContents || !fileContents.cells) return;
						const metadata = get().metadata;
						const filePath = "./" + get().getNotebookPath()!;

						set(() => ({ isSaving: true }));

						if (fileContents && fileContents.cells) {
							// Copy over the metadata before saving
							fileContents.metadata = metadata;

							// Copy over the cells before saving
							fileContents.cells = get().cells;
							try {
								ConnectionManager.getInstance().serviceManager?.contents.save(
									filePath,
									{
										type: "notebook",
										content: {
											...get().fileContents,
											cells: get().cells.map((cell) => {
												if (
													cell.cell_type == "markdown"
												) {
													delete cell.id;
												}
												return cell;
											}),
											metadata: get().metadata,
										},
									},
								);
							} catch (e) {
								console.error(
									"Error encountered while saving: ",
									e,
								);
							}
						}
						set(() => ({ isSaving: false }));

						get().refreshFiles(get().path, true);
					};

					debounceFn(saveNotebook);
				},
				isSaving: false,
				lastSaveTime: -1,
				addExecutingCell: (cellId: string) => {
					const newExecutingCells = new Set(get().executingCells);
					newExecutingCells.add(cellId);
					set((state) => ({
						executingCells: newExecutingCells,
					}));
				},
				removeExecutingCell: (cellId: string) => {
					const newExecutingCells = new Set(get().executingCells);
					newExecutingCells.delete(cellId);
					set((state) => ({
						executingCells: newExecutingCells,
					}));
				},
				setExecutingCells: (cellIds: string[]) => {
					set((state) => ({
						executingCells: new Set(cellIds),
					}));
				},
			} as any),
		{
			partialize: (state) => {
				const { cells, activeCellIndex } = state;
				return { cells, activeCellIndex };
			},
			equality(pastState, currentState) {
				return pastState.cells.every(
					(cell, index) => cell === currentState.cells[index],
					currentState,
				);
			},
		},
	),
);
