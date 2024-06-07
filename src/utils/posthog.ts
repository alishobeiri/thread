import { getCookie } from "cookies-next";
import posthog from "posthog-js";
import { PH_PROJECT_API_KEY } from "./constants/constants";

// Used to easily enable posthog in development
const POSTHOG_OVERRIDE = false;

export const initializePosthog = () => {
	const middlewareBootstrapData = getPostHogMiddlewareCookie();
	if (
		typeof window !== "undefined" &&
		(process.env.NODE_ENV === "production" ||
			process.env.NEXT_PUBLIC_NODE_ENV === "production" ||
			POSTHOG_OVERRIDE)
	) {
		posthog.init(PH_PROJECT_API_KEY, {
			api_host: window.location.origin + "/ingest",
			ui_host: "https://app.posthog.com",
			bootstrap: middlewareBootstrapData,
			// Do not record any session, just use PostHog to capture events
			disable_session_recording: true,
		});
	}
};

export const getPostHogMiddlewareCookie = () => {
	const cookie = getCookie("posthogData");
	try {
		if (cookie) {
			return JSON.parse(cookie as string);
		}
	} catch (e) {
		console.error(e);
	}

	return {
		featureFlags: {},
	};
};

export const getFeatureFlag = (key: string) => {
	if (typeof window !== "undefined") {
		// this is being called on the client, fetch flags from cookies
		// assuming getCookie is a function that retrieves cookies
		return posthog.getFeatureFlag(key);
	} else {
		// this is being called on the server, fetch flags from posthog function
		return getPostHogMiddlewareCookie()["featureFlags"][key];
	}
};

export const trackEventData = (
	eventType: string,
	eventProperties?: Record<string, unknown>,
) => {
	if (
		process.env.NODE_ENV === "production" ||
		process.env.NEXT_PUBLIC_NODE_ENV === "production" ||
		POSTHOG_OVERRIDE
	) {
		posthog.capture(eventType, eventProperties);
	}
};

export const trackEventDuration = (
	eventType: string,
	startTimestamp: number,
	eventProperties?: Record<string, unknown>,
) => {
	const endTimestamp = Date.now();
	const durationSeconds = (endTimestamp - startTimestamp) / 1000;

	if (
		process.env.NODE_ENV === "production" ||
		process.env.NEXT_PUBLIC_NODE_ENV === "production" ||
		POSTHOG_OVERRIDE
	) {
		posthog.capture(eventType, {
			duration_s: durationSeconds,
			...eventProperties,
		});
	}
};

export const trackClickEvent = (
	eventType: string,
	eventProperties?: Record<string, unknown>,
) => {
	if (
		process.env.NODE_ENV === "production" ||
		process.env.NEXT_PUBLIC_NODE_ENV === "production" ||
		POSTHOG_OVERRIDE
	) {
		posthog.capture(eventType, { ...eventProperties, click: true });
	}
};
