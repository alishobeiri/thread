import { AddIcon, CloseIcon } from "@chakra-ui/icons";
import {
	Box,
	Button,
	HStack,
	Heading,
	IconButton,
	Tooltip,
	VStack,
} from "@chakra-ui/react";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import Markdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import { InfoIcon, ToggleSidebar } from "../../../assets/icons";
import { useScrollToBottom } from "../../../hooks/useScroll";
import { standaloneToast } from "../../../theme";
import { BasicCodeMirrorEditor } from "../../../utils/codemirror";
import {
	MAX_MESSAGE_LENGTH,
	SCROLL_TO_BOTTOM_THRESHOLD,
	SIDEPANEL_WIDTH,
} from "../../../utils/constants/constants";
import { getCustomMarkdownComponents } from "../../../utils/markdown";
import { isPlatformMac } from "../../../utils/utils";
import { DynamicTextArea } from "../chat/TextInput";
import { ChatMessage, useChatStore } from "../chat/store/ChatStore";
import { useSidebarStore } from "../store/SidebarStore";

import { useHotkeys } from "react-hotkeys-hook";
import SidebarIcon from "../buttons/SidebarIcon";

// If the context is in a user message, then color differently and don't allow for deletion
const ContextContainer = ({
	context,
	isInMessage = true,
	index,
}: {
	context: string;
	isInMessage?: boolean;
	index?: number;
}) => {
	return (
		<Box
			width="100%"
			backgroundColor="orange.500"
			padding="2px"
			borderColor={isInMessage ? "white" : "orange.500"}
			borderWidth="1px"
			borderRadius={"md"}
			overflow={"hidden"}
			position="relative"
		>
			{!isInMessage && (
				<IconButton
					_hover={{ backgroundColor: "red.600" }}
					zIndex="1"
					size="xxs"
					colorScheme="orange"
					position="absolute"
					top="2"
					right="2"
					onClick={() => {
						const { removeChatContext } = useChatStore.getState();
						removeChatContext(index as any);
					}}
					icon={<CloseIcon />}
					aria-label={"Remove context"}
					title="Remove context"
				/>
			)}
			<BasicCodeMirrorEditor code={context} shouldOverflow={true} />
		</Box>
	);
};

const Message = ({
	message,
	isLastUserMessage,
}: {
	message: ChatMessage;
	isLastUserMessage: boolean;
}) => {
	const isResponding = useChatStore((state) => state.isResponding);
	const { user, text } = message;
	const [animationColor, setAnimationColor] = useState("var(--orange.500)");

	useEffect(() => {
		let intervalId: NodeJS.Timeout;

		// Start animating the color wheel if it's the last message and chat is responding
		if (isLastUserMessage && isResponding) {
			intervalId = setInterval(() => {
				// Generate a random color for animation
				const randomColor =
					"#" + Math.floor(Math.random() * 16777215).toString(16);
				setAnimationColor(randomColor);
			}, 250); // Change color every 1 second
		}

		return () => {
			clearInterval(intervalId); // Clean up interval on component unmount
		};
	}, [isLastUserMessage, isResponding]);

	const userSpecificStyles =
		user === "user"
			? {
					backgroundColor: "var(--jp-layout-color1)",
					color: "var(--chakra-colors-chakra-body-text)",
					borderBottomRightRadius: 0,
					border:
						isLastUserMessage && isResponding
							? `2px solid ${animationColor}`
							: "none",
					transition: "border-color 1s ease-in-out", // Add transition for smoother animation
			  }
			: {
					backgroundColor: "var(--chakra-colors-chakra-body-bg)",
			  };

	const customComponents = useMemo(() => {
		return getCustomMarkdownComponents({
			showCodeBlockActions: user === "user" ? false : true,
		});
	}, [user]);

	return (
		<VStack
			width="100%"
			padding={2}
			boxShadow={"sm"}
			borderRadius={"md"}
			{...userSpecificStyles}
		>
			<Box
				fontSize="smaller"
				color="inherit"
				width="100%"
				fontWeight={500}
				wordBreak={"break-word"}
				overflow="hidden"
				textOverflow="ellipsis"
				whiteSpace="pre-wrap"
				pb={isLastUserMessage ? 4 : 0}
			>
				{message.contexts.length > 0 && (
					<VStack gap={2} mb="2">
						{message.contexts.map((context, i) => {
							return (
								<ContextContainer key={i} context={context} />
							);
						})}
					</VStack>
				)}
				<Markdown
					remarkPlugins={[remarkGfm, remarkBreaks]}
					rehypePlugins={[rehypeRaw]}
					components={customComponents as any}
				>
					{text as string}
				</Markdown>
			</Box>
		</VStack>
	);
};

function ChatPanelFooter() {
	const [value, setValue] = useState<string>("");
	const currentChatContext = useChatStore(
		(state) => state.currentChatContext,
	);
	const isResponding = useChatStore((state) => state.isResponding);

	const currentMessageLength = value.length;
	const aggregateMessageLength = currentChatContext.reduce(
		(total, currentString) => {
			return total + currentString.length;
		},
		currentMessageLength,
	);

	const handleQueryChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
		setValue(e.target.value);
	};

	const handleQuerySubmit = async (query: string) => {
		if (!query.length) return;
		else if (aggregateMessageLength > MAX_MESSAGE_LENGTH) {
			standaloneToast({
				title: "Error",
				description: "The chat message is too long. Please try again.",
				status: "error",
				duration: 3000,
				isClosable: true,
			});
			return;
		}

		const { askChatAssistant } = useChatStore.getState();

		askChatAssistant(query);
		setValue("");
	};

	return (
		<VStack gap={3} width="100%" paddingX="12px" paddingBottom="12px">
			{currentChatContext.map((text, i) => (
				<ContextContainer
					key={i}
					context={text}
					isInMessage={false}
					index={i}
				/>
			))}
			{isResponding ? (
				<HStack width="100%" justifyContent="center" height={"50px"}>
					<Button
						fontSize="11px"
						size="xs"
						variant="ghost"
						onClick={() =>
							useChatStore.getState().abortController?.abort()
						}
						leftIcon={
							<span>({isPlatformMac() ? "⌘" : "Ctrl"} + ⌫)</span>
						}
						backgroundColor={"var(--jp-layout-color1)"}
						p={4}
						py={2}
					>
						Cancel
					</Button>
				</HStack>
			) : (
				<DynamicTextArea
					value={value}
					handleChange={handleQueryChange}
					handleSubmit={handleQuerySubmit}
				/>
			)}
		</VStack>
	);
}

const Messages = () => {
	const messages: ChatMessage[] = useChatStore((state) => state.messages);
	const containerRef = useRef<HTMLDivElement>(null);
	const lastMessageRef = useRef<HTMLDivElement | null>(null);
	const { handleScroll } = useScrollToBottom(
		containerRef,
		SCROLL_TO_BOTTOM_THRESHOLD,
	);

	useEffect(() => {
		if (containerRef.current) {
			lastMessageRef.current?.scrollIntoView({ behavior: "smooth" });
		}
	}, [messages.length]);

	const findLastUserMessageIndex = (user: string): number => {
		for (let i = messages.length - 1; i >= 0; i--) {
			if (messages[i].user === user) {
				return i;
			}
		}
		return -1; // User not found
	};

	return (
		<VStack
			gap={3}
			padding={"12px"}
			width="100%"
			flex="1"
			overflowY="auto"
			ref={containerRef}
			onScroll={handleScroll}
		>
			{messages.map((message, index) => {
				const isLastUserMessage =
					index === findLastUserMessageIndex("user");
				return (
					<Box
						width={"100%"}
						ref={isLastUserMessage ? lastMessageRef : null}
						key={message.id}
					>
						<Message
							message={message}
							isLastUserMessage={isLastUserMessage}
						/>
					</Box>
				);
			})}
		</VStack>
	);
};

export default function ChatContent({
	handleCloseSidebar,
}: {
	handleCloseSidebar: () => void;
}) {
	const containerRef = useRef<HTMLDivElement>(null);
	const isChatLive = useChatStore((state) => state.isChatLive);

	useHotkeys("mod+backspace", () => {
		if (useChatStore.getState().isResponding) {
			useChatStore.getState().abortController?.abort();
		}
	});

	return (
		<Box
			ref={containerRef}
			width={`${SIDEPANEL_WIDTH}px`}
			height="100%"
			borderRight="1px solid var(--chakra-colors-chakra-border-color)"
		>
			<VStack width="100%" height="100%" gap={0}>
				<HStack
					width="100%"
					display={"flex"}
					flex="0 0 auto"
					justifyContent={"space-between"}
					padding={"12px"}
				>
					<Heading fontSize="smaller" textTransform={"uppercase"}>
						Chat
						<Tooltip
							fontSize="xs"
							hasArrow
							borderRadius={"sm"}
							placement="top"
							label={`The chat is context-aware, with information about your current notebook. You can add specific context by selecting code in the notebook.`}
						>
							<InfoIcon
								ml={2}
								fontSize={"xs"}
								cursor={"pointer"}
							/>
						</Tooltip>
					</Heading>
					<SidebarIcon
						label={`Close sidebar (${
							isPlatformMac() ? "⌘ + B" : "Ctrl + B"
						})`}
						icon={<ToggleSidebar />}
						size="sm"
						onClick={handleCloseSidebar}
					/>
				</HStack>
				<VStack
					width="100%"
					onClick={() => {
						const { textInputRef } = useSidebarStore.getState();
						textInputRef?.focus();
					}}
					overflow={"auto"}
				>
					<HStack
						width={"100%"}
						justifyContent={"space-between"}
						px={2}
					>
						{isChatLive ? (
							<Button
								fontSize="11px"
								size="xs"
								variant="ghost"
								onClick={() => {
									useChatStore
										.getState()
										.abortController?.abort();
									useChatStore.getState().endChat();
								}}
								leftIcon={<AddIcon boxSize="8px" />}
							>
								New chat
							</Button>
						) : (
							<></>
						)}
					</HStack>
					{isChatLive && <Messages />}
					<ChatPanelFooter />
				</VStack>
			</VStack>
		</Box>
	);
}
