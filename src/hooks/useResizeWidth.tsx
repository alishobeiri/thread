import { useCallback } from "react";

export const useResizeWidth = (
	currentWidth: number,
	setWidth: (width: number) => void,
	minWidth: number,
	maxWidth: number,
) => {
	const onMouseDown = useCallback(
		(e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
			const startX = e.clientX;
			const startWidth = currentWidth;

			const onMouseMove = (moveEvent: MouseEvent) => {
				const newWidth = startWidth + moveEvent.clientX - startX;
				setWidth(Math.max(minWidth, Math.min(newWidth, maxWidth)));
			};

			const onMouseUp = () => {
				document.removeEventListener("mousemove", onMouseMove);
				document.removeEventListener("mouseup", onMouseUp);
			};

			document.addEventListener("mousemove", onMouseMove);
			document.addEventListener("mouseup", onMouseUp);
		},
		[currentWidth, setWidth, minWidth, maxWidth],
	);

	return onMouseDown;
};
