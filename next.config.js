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

// Injected content via Sentry wizard below
const { withSentryConfig } = require("@sentry/nextjs");

module.exports = withSentryConfig(
	module.exports,
	{
		// For all available options, see:
		// https://github.com/getsentry/sentry-webpack-plugin#options

		// Suppresses source map uploading logs during build
		silent: true,
		org: "squaredtechnologiesinc",
		project: "VizlyNotebook",
	},
	{
		// For all available options, see:
		// https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

		// Upload a larger set of source maps for prettier stack traces (increases build time)
		widenClientFileUpload: true,

		enableTracing: false,

		// Transpiles SDK to be compatible with IE11 (increases bundle size)
		transpileClientSDK: true,

		// Routes browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers (increases server load)
		tunnelRoute: "/monitoring",

		// Hides source maps from generated client bundles
		hideSourceMaps: true,

		// Automatically tree-shake Sentry logger statements to reduce bundle size
		disableLogger: true,

		// Enables automatic instrumentation of Vercel Cron Monitors.
		// See the following for more information:
		// https://docs.sentry.io/product/crons/
		// https://vercel.com/docs/cron-jobs
		automaticVercelMonitors: true,
	},
);
