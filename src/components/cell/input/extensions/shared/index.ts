import { Facet } from "@codemirror/state";
import {
	Compartment,
	EditorSelection,
	EditorState,
	EditorView,
	Extension,
	ViewPlugin,
	ViewUpdate,
	keymap,
} from "@uiw/react-codemirror";
import { useCallback, useEffect, useMemo } from "react";
import { useMagicInputStore } from "../../../../input/MagicInputStore";

// Define the type for your change handlers
export type ChangeHandler = (update: ViewUpdate, code: string) => string;
export const changeHandlerFacet = Facet.define<
	ChangeHandler[],
	ChangeHandler[]
>({
	combine(changeHandlers) {
		// Flatten the array of change handlers
		return changeHandlers.flat();
	},
});

export const getSelectedCode = (
	state: EditorState,
	selectionRange?: EditorSelection,
) => {
	return (selectionRange ?? state.selection).ranges
		.map((range) =>
			state.doc.sliceString(
				Math.max(0, range.from),
				Math.min(range.to, state.doc.length),
			),
		)
		.join("\n");
};

export const onChangePlugin = (finalOnChange: (code: string) => void) =>
	ViewPlugin.fromClass(
		class {
			constructor() {}

			update(update: ViewUpdate) {
				if (update.docChanged) {
					let fullCode = update.state.doc.toString();

					// Each extension can define an onChange handler, unify them all using the facet
					const changeHandlers =
						update.view.state.facet(changeHandlerFacet);

					// Apply each change handler to fullCode
					changeHandlers.forEach((handler) => {
						fullCode = handler(update, fullCode);
					});

					// Call the final onChange handler with the final fullCode
					finalOnChange(fullCode);
				}
			}
		},
	);

export function useExtensionWithDependency(
	view: EditorView | undefined,
	extensionFactory: () => Extension,
	deps: any[],
) {
	const compartment = useMemo(() => new Compartment(), []);
	const stableExtensionFactory = useCallback(extensionFactory, deps);
	const extension = useMemo(() => compartment.of(stableExtensionFactory()), [compartment, stableExtensionFactory]);

	useEffect(() => {
		if (view && view.dispatch) {
			try {
				view.dispatch({
					effects: compartment.reconfigure(stableExtensionFactory()),
				});
			} catch (error) {
				console.warn("Error reconfiguring CodeMirror extensions:", error);
			}
		}
	}, [view, compartment, stableExtensionFactory]);

	return extension;
}

export const modKKeymap = keymap.of([
	{
		key: "Mod-k",
		run: (view: EditorView) => {
			useMagicInputStore.getState().focusMagicInput();
			return true;
		},
	},
]);
