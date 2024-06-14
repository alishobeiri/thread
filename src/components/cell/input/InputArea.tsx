import { Box, HStack } from "@chakra-ui/react";
import { python } from "@codemirror/lang-python";
import { keymap } from "@codemirror/view";
import { ICell } from "@jupyterlab/nbformat";
import CodeMirror, {
	Prec,
	ReactCodeMirrorRef,
	gutter,
} from "@uiw/react-codemirror";
import { ForwardedRef, MutableRefObject, forwardRef, useEffect } from "react";
import { useNotebookStore } from "../../notebook/store/NotebookStore";
import { jupyterLabKeymap } from "./keymap";
import { jupyterTheme } from "./theme";

import { indentationMarkers } from "@replit/codemirror-indentation-markers";
import CodeMirrorMerge, { CodeMirrorMergeRef } from "react-codemirror-merge";
import ConnectionManager from "../../../services/connection/connectionManager";
import { multilineStringToString } from "../../../utils/utils";
import { enableEditMode } from "../actions/actions";
import useCellStore from "../store/CellStore";
import InputAreaToolbar from "./InputAreaToolbar";
import { codeSelectionExtension } from "./extensions/codeSelection";
import { documentUri } from "./extensions/languageServer";
import { newLineText } from "./extensions/newLineText";
import {
	modKKeymap,
	onChangePlugin,
	useExtensionWithDependency,
} from "./extensions/shared";

const Original = CodeMirrorMerge.Original;
const Modified = CodeMirrorMerge.Modified;

interface InputAreaProps {
	index: number;
	active: boolean;
	cell: ICell;
	isBeingEdited: boolean;
	isCodeEditable?: boolean;
}

const InputArea = forwardRef<ReactCodeMirrorRef, InputAreaProps>(
	(
		{ index, active, cell, isBeingEdited, isCodeEditable = true },
		forwardedCmRef: ForwardedRef<ReactCodeMirrorRef | null>,
	) => {
		const cellId = cell.id as string;
		const cmRef =
			forwardedCmRef as MutableRefObject<ReactCodeMirrorRef | null>;
		const cmMergeRef =
			forwardedCmRef as MutableRefObject<CodeMirrorMergeRef | null>;
		const cellState =
			useCellStore((state) => state.cellStates)[cell.id as string] ?? {};
		const proposedSource = cellState.proposedSource || "";
		const setProposedSource = useCellStore.getState().setProposedSource;
		const status = cellState.status || "initial";
		const isInitial = status === "initial";
		const isGenerating = status === "generating";
		const { source: rawSource } = cell;
		const source = multilineStringToString(rawSource);
		const { setCellSource } = useNotebookStore.getState();
		const onChange = (updatedSource: string) => {
			// Clients can create custom onChange handlers to prevent triggering re-renders
			setCellSource(cell.id as string, updatedSource);
		};

		const getRefView = () => {
			if (isInitial) {
				return cmRef.current?.view;
			} else {
				return cmMergeRef.current?.view?.a;
			}
		};

		const handleOnFocus = () => {
			useNotebookStore.setState({
				activeCellIndex: index,
			});
			enableEditMode();
		};

		useEffect(() => {
			if (isBeingEdited) {
				if (isInitial) {
					cmRef.current?.view?.focus();
				} else {
					cmMergeRef.current?.view?.a.focus();
				}
			} else {
				if (isInitial) {
					cmRef.current?.view?.contentDOM.blur();
				} else {
					cmMergeRef.current?.container?.blur();
				}
			}
		}, [active, isBeingEdited]);

		const allExtensions = useExtensionWithDependency(
			getRefView(),
			() => {
				const extensions = [
					python(),
					jupyterTheme,
					indentationMarkers({
						hideFirstIndent: true,
						highlightActiveBlock: true,
						markerType: "codeOnly",
						colors: {
							activeDark: "var(--jp-layout-color3)",
							dark: "var(--jp-layout-color2)",
							activeLight: "var(--jp-layout-color3)",
							light: "var(--jp-layout-color2)",
						},
					}),
					gutter({ class: "cm-mygutter" }),
					onChangePlugin(onChange),
				];
				const languageServer =
					ConnectionManager.getInstance().languageServerExtension;
				if (languageServer) {
					extensions.push(languageServer);
				}

				extensions.push(
					Prec.highest(documentUri.of(cell.id as string)),
				);

				if (isBeingEdited) {
					extensions.push(newLineText);
				}

				extensions.push(Prec.highest(keymap.of(jupyterLabKeymap)));
				if (isBeingEdited) {
					extensions.push(codeSelectionExtension());
				}
				extensions.push(modKKeymap);

				return extensions;
			},
			[isBeingEdited],
		);

		return (
			<Box position={"relative"}>
				<HStack
					width="100%"
					overflow="auto"
					gap={0}
					alignItems={"flex-start"}
					height="100%"
					backgroundColor={"var(--jp-layout-color1)"}
				>
					<>
						{isInitial && (
							<CodeMirror
								ref={cmRef}
								className="cell-editor"
								lang="python"
								style={{
									overflow: "auto",
									width: "100%",
								}}
								onFocus={() => handleOnFocus()}
								value={source}
								extensions={[allExtensions]}
								basicSetup={{
									lineNumbers: true,
									tabSize: 4,
									foldGutter: false,
									highlightActiveLineGutter: true,
									highlightActiveLine: false,
								}}
								editable={isCodeEditable}
								readOnly={!isCodeEditable}
							/>
						)}
						{!isInitial && (
							<CodeMirrorMerge
								ref={cmMergeRef}
								style={{ width: "100%", height: "100%" }}
								onFocus={() => handleOnFocus()}
							>
								<Original
									editable={!isGenerating}
									readOnly={isGenerating}
									extensions={[allExtensions]}
									value={source}
								/>
								<Modified
									value={proposedSource}
									editable={!isGenerating}
									readOnly={isGenerating}
									onChange={(e) =>
										setProposedSource(cell.id as string, e)
									}
									extensions={[jupyterTheme, python()]}
								/>
							</CodeMirrorMerge>
						)}
					</>
					<InputAreaToolbar
						id={cellId}
						active={active}
						source={source}
						index={index}
						cmRef={cmRef}
						type={"code"}
					/>
				</HStack>
			</Box>
		);
	},
);

InputArea.displayName = "PythonInputArea";

export default InputArea;
