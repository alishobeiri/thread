/** @type {import('next').NextConfig} */
const path = require("path");
const withTM = require("next-transpile-modules")(["@jupyter-widgets/base"]);

const nextConfig = {
	basePath: "/vizly-notebook",
	assetPrefix: process.env.NODE_ENV === "production" ? "/vizly-notebook/" : "",
	output: "export",
	images: {
		unoptimized: true,
	},
	reactStrictMode: false,
	webpack: (config, { isServer }) => {
		if (!isServer) {
			config.module.rules.push({
				test: /\.test\.ts$/,
				loader: "ignore-loader",
			});
			config.module.rules.push({
				test: /__tests__/,
				loader: "ignore-loader",
			});
			config.module.rules.push({
				test: /demo_assets/,
				loader: "ignore-loader",
			});
			config.module.rules.push({
				test: /\.(js|jsx|ts|tsx)$/,
				include: path.resolve(__dirname, "proxy"),
				loader: "ignore-loader",
			});
		}
		return config;
	},
};

module.exports = withTM(nextConfig);
