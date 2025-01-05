import { PostHog } from "posthog-node";
import { PH_PROJECT_API_KEY } from "../../../utils/constants/constants";

export class PostHogClient {
	private static instance: PostHog;
	private constructor() {
		PostHogClient.instance = new PostHog(PH_PROJECT_API_KEY, {
			host: "https://app.posthog.com",
		});
	}

	public static async getInstance(): Promise<PostHog> {
		if (!PostHogClient.instance) {
			new PostHogClient();
			await PostHogClient.shutdownAsync();
		}

		return PostHogClient.instance;
	}

	public static async shutdownAsync() {
		if (PostHogClient.instance) {
			await PostHogClient.instance.shutdownAsync();
		}
	}

	public static async trackEventData(
		distinctId: string,
		eventType: string,
		eventProperties?: Record<string, unknown>,
	) {
		const client = await PostHogClient.getInstance();
		client.capture({
			distinctId: distinctId,
			event: eventType,
			properties: eventProperties,
		});
	}
}
