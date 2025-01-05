import { captureException } from "@sentry/nextjs";
import {
	AuthError,
	AuthOtpResponse,
	createClient,
} from "@supabase/supabase-js";
import type { NextApiRequest, NextApiResponse } from "next";
import { Database } from "../../../types/database.types";

const serviceRoleSupabase = createClient<Database>(
	process.env.NEXT_PUBLIC_SUPABASE_URL!,
	process.env.SUPABASE_SERVICE_KEY!,
);

type ExtendedAuthOtpResponse = AuthOtpResponse & {
	isBlocked?: boolean;
};

const normalizeEmail = (email: string) => {
	// Lowercase the email address
	email = email.toLowerCase();

	// Split the email into local part and domain part
	const [localPart, domain] = email.split("@");

	// Normalize the domain if it's 'googlemail.com'
	const normalizedDomain = domain === "googlemail.com" ? "gmail.com" : domain;

	// Check if the domain is 'gmail.com'
	if (normalizedDomain === "gmail.com") {
		// Remove the dots in the local part for Gmail addresses
		let normalizedLocalPart = localPart.split(".").join("");

		// Remove everything after the plus sign
		const plusIndex = normalizedLocalPart.indexOf("+");
		if (plusIndex !== -1) {
			normalizedLocalPart = normalizedLocalPart.substring(0, plusIndex);
		}

		// Reconstruct the email with the normalized local part and domain
		return normalizedLocalPart + "@" + normalizedDomain;
	}

	// Return the original email if the domain is not 'gmail.com'
	return email;
};

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse<ExtendedAuthOtpResponse>,
) {
	if (req.method === "POST") {
		const { email, captchaToken } = req.body;

		const [_, domain] = email.split("@");

		try {
			// Check if the domain is in the blocked domains list
			const domainLookup = await serviceRoleSupabase
				.from("blocked_domains")
				.select("*")
				.eq("domain", domain)
				.maybeSingle();

			if (domainLookup.data) {
				res.status(400).json({
					data: { user: null, session: null },
					error: new AuthError("Email is blocked"),
					isBlocked: true,
				});
				return;
			}
		} catch (error) {
			captureException(error);
		}

		// Find blocked emails
		const normalizedEmail = normalizeEmail(email);
		try {
			// Check if the domain is in the blocked domains list
			const emailLookup = await serviceRoleSupabase
				.from("blocked_emails")
				.select("*")
				.eq("email", normalizedEmail)
				.maybeSingle();

			if (emailLookup.data) {
				res.status(400).json({
					data: { user: null, session: null },
					error: new AuthError("Email is blocked"),
					isBlocked: true,
				});
				return;
			}
		} catch (error) {
			captureException(error);
		}

		let disposable = false;
		let shouldBlock = false;
		try {
			const emailResponse = await fetch(
				`https://verifymail.io/api/${email}?key=470039373a204841bbcead30a058c514`,
			);
			const responseJson = await emailResponse.json();
			shouldBlock = responseJson["block"] ? true : false;
			disposable = responseJson["disposable"] ? true : false;
		} catch (error) {
			captureException(error);
		}

		if (shouldBlock || disposable) {
			// Insert the domain into the blocked_domains table
			if (
				disposable &&
				domain != "gmail.com" &&
				domain != "googlemail.com"
			) {
				await serviceRoleSupabase
					.from("blocked_domains")
					.insert([{ domain }]);
			}

			res.status(400).json({
				data: { user: null, session: null },
				error: new AuthError("Email is blocked"),
				isBlocked: true,
			});
			return;
		}

		try {
			const result = await serviceRoleSupabase
				.from("users")
				.select("*")
				.eq("email", email)
				.maybeSingle();

			// Should create a new user if one already does not exist
			const shouldCreateUser = !(
				result &&
				result.data &&
				result.data.email
			);

			const response = await serviceRoleSupabase.auth.signInWithOtp({
				email,
				options: {
					shouldCreateUser: shouldCreateUser,
					captchaToken,
				},
			});

			res.status(200).json(response);
		} catch (error: any) {
			res.status(400).json({
				data: { user: null, session: null },
				error: new AuthError(error),
			});
		}
	} else {
		// Handle any other HTTP method
		res.status(405).json({
			data: { user: null, session: null },
			error: new AuthError("Method not allowed"),
		});
	}
}
