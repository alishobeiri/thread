import { Box, Link, Text } from "@chakra-ui/react";
import React, { Component, ReactNode } from "react";

interface IPyWidgetErrorBoundaryProps {
	children: ReactNode;
}

interface IPyWidgetErrorBoundaryState {
	hasError: boolean;
}

class IPyWidgetErrorBoundary extends Component<
	IPyWidgetErrorBoundaryProps,
	IPyWidgetErrorBoundaryState
> {
	constructor(props: IPyWidgetErrorBoundaryProps) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError(error: Error): IPyWidgetErrorBoundaryState {
		return { hasError: true };
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
		console.error(
			"Error caught by IPyWidgetErrorBoundary:",
			error,
			errorInfo,
		);
	}

	render(): ReactNode {
		if (this.state.hasError) {
			return (
				<Box color="red.500">
					<Text>
						Something went wrong when rendering this IPyWidget.
						Please raise an issue on GitHub{" "}
						<Text
							as={Link}
							href={
								"https://github.com/squaredtechnologies/thread/issues"
							}
							target={"_blank"}
							cursor={"pointer"}
							color="blue.500"
						>
							here
						</Text>
						.
					</Text>
				</Box>
			);
		}

		return this.props.children;
	}
}

export default IPyWidgetErrorBoundary;
