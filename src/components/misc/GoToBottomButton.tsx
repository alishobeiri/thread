import { ArrowDownIcon } from "@chakra-ui/icons";
import { IconButton } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { trackClickEvent } from "../../utils/posthog";
import { useNotebookStore } from "../notebook/store/NotebookStore";

export const handleGoToBottom = (
	refToTrack: React.RefObject<HTMLDivElement>,
) => {
	if (refToTrack && refToTrack.current) {
		const bottomPosition = refToTrack.current.scrollHeight;

		refToTrack.current.scrollTo({
			top: bottomPosition,
			behavior: "smooth",
		});
	}
};

export function GoToBottomButton({
	refToTrack,
}: {
	refToTrack: React.RefObject<HTMLDivElement>;
}) {
	const [showGoToBottom, setShowGoToBottom] = useState(false);

	const checkScrollPosition = () => {
		if (!refToTrack.current) return;
		const threshold = 100; // change this value if needed
		const isAtBottom =
			refToTrack.current.scrollHeight -
				refToTrack.current.scrollTop -
				refToTrack.current.clientHeight <
			threshold;
		setShowGoToBottom(!isAtBottom);
	};

	useEffect(() => {
		if (!refToTrack.current) return;
		refToTrack.current.addEventListener("scroll", checkScrollPosition);

		return () => {
			if (!refToTrack.current) return;
			refToTrack.current.removeEventListener(
				"scroll",
				checkScrollPosition,
			);
		};
	}, []);

	return (
		showGoToBottom && (
			<IconButton
				size="md"
				variant="outline"
				borderRadius={"full"}
				aria-label="Go to bottom"
				pos={"absolute"}
				top={"-80px"}
				colorScheme="orange"
				boxShadow={"lg"}
				right={"50%"}
				zIndex={10000}
				_hover={{ zIndex: 10000 }}
				icon={<ArrowDownIcon />}
				backgroundColor="var(--jp-layout-color1)"
				onClick={() => {
					handleGoToBottom(refToTrack);
					trackClickEvent(`Go to bottom`);
				}}
			/>
		)
	);
}
