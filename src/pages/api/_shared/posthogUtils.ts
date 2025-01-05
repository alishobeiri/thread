import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { PH_PROJECT_API_KEY } from "../../../utils/constants/constants";

export async function posthogRequest(request: NextRequest) {
	const ph_cookie_key = `ph_${PH_PROJECT_API_KEY}_posthog`;
	const cookie = request.cookies.get(ph_cookie_key);

	let distinct_id;
	if (cookie) {
		distinct_id = JSON.parse(cookie.value).distinct_id;
	} else {
		distinct_id = crypto.randomUUID();
	}

	const requestOptions = {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			api_key: PH_PROJECT_API_KEY,
			distinct_id: distinct_id,
		}),
	};

	const response = NextResponse.next();
	try {
		const ph_request = (await Promise.race([
			fetch("https://app.posthog.com/decide?v=3", requestOptions),
			new Promise((_, reject) =>
				setTimeout(() => reject("Request timed out"), 500),
			),
		])) as Response;

		const data = await ph_request.json();
		let posthogData = {
			distinctID: distinct_id,
			featureFlags: data.featureFlags,
		};
		// Code to validate specific experiment value
		// posthogData = {
		// 	...posthogData,
		// 	featureFlags: {
		// 		...posthogData.featureFlags,
		// 		"google-drive-enabled": true,
		// 	},
		// };
		response.cookies.set("posthogData", JSON.stringify(posthogData));
	} catch (error) {
		console.error(error);
	}

	return response;
}
