import { HStack, Heading, Link, Text, VStack } from "@chakra-ui/react";
import { NextPage } from "next";
import Head from "next/head";

const Custom404: NextPage = () => {
	return (
		<>
			<Head>
				<title>Page not found</title>
				<meta name="description" content="Page could not be found" />
				<meta
					name="viewport"
					content="width=device-width, initial-scale=1"
				/>
				<link rel="icon" href="/favicon.ico" />
			</Head>
			<HStack
				py="24"
				width="100%"
				justifyContent={"center"}
				px={{ sm: "6", base: "4", md: "24" }}
			>
				<VStack width="100%">
					<Heading fontSize="9xl" fontFamily={"Space Grotesk"}>
						404
					</Heading>
					<Heading
						fontSize="2xl"
						fontFamily={"Space Grotesk"}
						textAlign={"center"}
					>
						This page cannot be found.{" "}
						<Text
							href="/vizly-notebook"
							color="orange.300"
							as={Link}
						>
							Return to the launcher.
						</Text>
					</Heading>
				</VStack>
			</HStack>
		</>
	);
};

export default Custom404;
