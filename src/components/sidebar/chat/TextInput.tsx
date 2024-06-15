import { Button, HStack, Textarea, VStack } from "@chakra-ui/react";
import { KeyboardEvent, useEffect, useRef } from "react";
import ResizeTextarea from "react-textarea-autosize";
import { useSidebarStore } from "../store/SidebarStore";

interface DynamicTextAreaProps {
	value: string;
	handleChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
	handleSubmit: (userQuery: string) => void;
	isDisabled?: boolean;
}

export function DynamicTextArea({
	value,
	handleChange,
	handleSubmit,
	isDisabled = false,
}: DynamicTextAreaProps) {
	const textInputRef = useRef<any>(null);

	useEffect(() => {
		const { setTextInputRef } = useSidebarStore.getState();
		setTextInputRef(textInputRef.current);
	}, []);

	const handleQuery = async (userQuery: string) => {
		if (userQuery.length === 0) return;
		await handleSubmit(userQuery);
	};

	const handleKeyPress = (event: KeyboardEvent<HTMLTextAreaElement>) => {
		if (event.key === "Enter" && !event.shiftKey) {
			handleQuery(value);
			event.stopPropagation();
			event.preventDefault();
		} else if ((event.ctrlKey || event.metaKey) && event.key === "b") {
			const { toggleOpen, setIsExpanded, isExpanded } =
				useSidebarStore.getState();
			textInputRef.current.blur();

			event.stopPropagation();
			event.preventDefault();
		}
	};

	return (
		<VStack
			style={{ position: "relative", width: "100%", borderRadius: "md" }}
			backgroundColor={"var(--jp-layout-color2)"}
			gap={0}
			borderRadius={"xl"}
		>
			<Textarea
				id="prompt-textarea"
				onChange={handleChange}
				as={ResizeTextarea}
				ref={textInputRef}
				onKeyDown={handleKeyPress}
				p={"0.5rem"}
				px={"0.75rem"}
				rows={1}
				isDisabled={isDisabled}
				autoFocus
				placeholder="Ask anything"
				style={{
					resize: "none",
					border: "none",
					outline: "none",
				}}
				minRows={1}
				maxRows={8}
				backgroundColor={"var(--jp-layout-color2)"}
				value={value}
				width="100%"
				fontSize={"0.8rem"}
				lineHeight={"1.5rem"}
				resize="none"
				mb={0}
				pb={0}
				_focus={{
					outline: "none",
					borderColor: "transparent",
				}}
				_focusVisible={{
					outline: "none",
					borderColor: "transparent",
				}}
			/>
			<HStack
				width={"100%"}
				justifyContent={"flex-end"}
				padding={"0.5rem"}
				pt={0}
				m={0}
			>
				<Button
					colorScheme="orange"
					size="xs"
					onClick={() => handleQuery(value)}
					disabled={isDisabled || value.length == 0}
					style={{
						alignSelf: "flex-end",
					}}
				>
					⏎ Submit
				</Button>
			</HStack>
		</VStack>
	);
}
