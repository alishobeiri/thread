import "@fontsource/space-grotesk";
import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

// Route segment config
export const runtime = "edge";

// Image metadata
export const alt = "Vizly";
export const size = {
	width: 800,
	height: 413,
};

export const contentType = "image/png";

function loadFont(name: string) {
	return fetch(name).then((res) => res.arrayBuffer());
}

// Image generation
export default async function Image(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const hasTitle = searchParams.has("title");
		const title = hasTitle ? searchParams.get("title") : "vizly.fyi";

		const spaceGroteskBold = await loadFont(
			"https://cdn.jsdelivr.net/fontsource/fonts/space-grotesk@latest/latin-700-normal.ttf",
		);

		const spaceGroteskMedium = await loadFont(
			"https://cdn.jsdelivr.net/fontsource/fonts/space-grotesk@latest/latin-500-normal.ttf",
		);

		return new ImageResponse(
			(
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						alignItems: "flex-start",
						justifyContent: "center",
						width: "800px",
						height: "413px",
						backgroundColor: "white",
						padding: "20px 40px",
						gap: "16px",
					}}
				>
					<div
						style={{
							left: 42,
							top: 42,
							position: "absolute",
							display: "flex",
							alignItems: "center",
						}}
					>
						<img
							style={{
								width: 24,
								height: 24,
							}}
							src="https://vizly.fyi/favicon.png"
						/>
						<span
							style={{
								marginLeft: 8,
								fontSize: 20,
							}}
						>
							{title}
						</span>
					</div>
					<div
						style={{
							marginTop: "20px",
							display: "flex",
							alignItems: "center",
							justifyContent: "flex-start",
							width: "100px",
							height: "100px",
							gap: "20px",
						}}
					>
						<img
							src="https://vizly.fyi/favicon.png"
							alt="Vizly Logo"
							style={{ width: "128px", height: "128px" }}
						/>
						<h1
							style={{
								fontSize: "96px",
								fontWeight: "700",
								color: "#BC81F6",
							}}
						>
							Vizly
						</h1>
					</div>
					<p style={{ fontSize: "48px", fontWeight: "500" }}>
						AI-powered data analysis
					</p>
				</div>
			),
			// ImageResponse options
			{
				// For convenience, we can re-use the exported opengraph-image
				// size config to also set the ImageResponse's width and height.
				...size,
				fonts: [
					{
						name: "Space Grotesk",
						style: "normal",
						data: spaceGroteskBold,
						weight: 700,
					},
					{
						name: "Space Grotesk",
						style: "normal",
						data: spaceGroteskMedium,
						weight: 500,
					},
				],
			},
		);
	} catch (e: any) {
		return new Response("Failed to generate OpenGraph image", {
			status: 500,
		});
	}
}
