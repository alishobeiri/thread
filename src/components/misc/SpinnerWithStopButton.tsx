import {
	Box,
	IconButton,
	Spinner as ChakraSpinner,
	useTheme,
} from "@chakra-ui/react";
import { StopCircleIcon } from "../../assets/icons";

const SpinnerWithStopButton: React.FC<{
	isSpinning: boolean;
	onClick: () => void;
}> = ({ isSpinning, onClick }) => {
	return (
		<Box position="relative" display="inline-block">
			{isSpinning && (
				<ChakraSpinner
					position="absolute"
					size={"lg"}
					thickness="4px"
					speed="0.65s"
					emptyColor="gray.300"
					color="orange.500"
					zIndex={1}
					top="10%"
					left="10%"
				/>
			)}
			<IconButton
				p={2}
				variant="ghost"
				icon={<StopCircleIcon color="orange.200" boxSize={"1.5em"} />}
				aria-label="Loading response"
				zIndex={2}
				position="relative"
				onClick={onClick}
			/>
		</Box>
	);
};

export default SpinnerWithStopButton;
