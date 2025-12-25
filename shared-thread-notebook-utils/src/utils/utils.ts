export const isBrowser = (): boolean => {
	return (
		typeof window !== "undefined" && typeof window.document !== "undefined"
	);
};
