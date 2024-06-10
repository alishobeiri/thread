import { NextRequest, NextResponse } from "next/server";

// This function can be marked `async` if using `await` inside
export async function middleware(req: NextRequest) {
	const origin = req.headers.get("origin");
	const res = NextResponse.next();

	// Allow requests from any localhost or 127.0.0.1 origin
	if (
		origin &&
		/^(http:\/\/localhost:\d+|http:\/\/127\.0\.0\.1:\d+)$/.test(origin)
	) {
		res.headers.set("Access-Control-Allow-Origin", origin);
		res.headers.set("Access-Control-Allow-Credentials", "true");
		res.headers.set(
			"Access-Control-Allow-Methods",
			"GET, DELETE, PATCH, POST, PUT, OPTIONS",
		);
		res.headers.set(
			"Access-Control-Allow-Headers",
			"X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, baggage, sentry-trace",
		);

		// Handle OPTIONS requests directly
		if (req.method === "OPTIONS") {
			return new NextResponse(null, {
				status: 204, // No Content
				headers: res.headers,
			});
		}
	}

	return res;
}
