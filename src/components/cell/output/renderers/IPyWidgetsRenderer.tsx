import { VStack } from "@chakra-ui/react";
import {
	IPYWIDGET_STATE_MIMETYPE,
	IPYWIDGET_VIEW_MIMETYPE,
} from "../mimeTypes";
import IPyWidgetErrorBoundary from "./ipywidgets/IPyWidgetErrorBoundary";
import IPyWidgetsAttached from "./ipywidgets/IPyWidgetsAttached";

const IPyWidgetRenderer: React.FC<any> = ({ data }) => {
	return (
		<IPyWidgetErrorBoundary>
			<VStack width="100%" alignItems={"flex-start"}>
				<IPyWidgetsAttached
					view={data[IPYWIDGET_VIEW_MIMETYPE]}
					state={data[IPYWIDGET_STATE_MIMETYPE]}
				/>
			</VStack>
		</IPyWidgetErrorBoundary>
	);
};

export default IPyWidgetRenderer;
