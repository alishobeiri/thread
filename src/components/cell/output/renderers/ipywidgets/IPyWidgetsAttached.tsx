import { useEffect, useRef } from "react";
import { createIPyWidgetsViewManager } from "./IPyWidgetsViewManager";

type Props = {
	view: any;
	state: any;
};

const IPyWidgetsAttached: React.FC<Props> = ({ view, state }) => {
	const ref = useRef<any>(null);

	useEffect(() => {
		if (ref.current) {
			(async () => {
				const IPyWidgetsViewManager =
					await createIPyWidgetsViewManager();
				const manager = new IPyWidgetsViewManager(ref.current);
				manager
					.set_state(state)
					.then((models: any) => {
						const filteredModel = models.find(
							(element: any) =>
								element.model_id === view.model_id,
						);
						return manager.create_view(filteredModel);
					})
					.then((view: any) => manager.display_view(view));
			})();
		}
	}, [view, state]);

	return <div ref={ref} />;
};

export default IPyWidgetsAttached;
