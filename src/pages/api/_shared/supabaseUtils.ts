import { SupabaseClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { NoterousUser } from "../../../services/connection/connectionManager";
import { Database } from "../../../types/database.types";
import { BASIC_PLAN, PREMIUM_PLAN } from "../../../utils/constants/plans";
import { NoterousLockManager } from "../../../utils/lock";

const serviceRoleSupabase = createClient<Database>(
	process.env.NEXT_PUBLIC_SUPABASE_URL!,
	process.env.SUPABASE_SERVICE_KEY!,
);

const stripe = new Stripe(process.env.STRIPE_KEY!);

const lockManager = new NoterousLockManager();

export const getApiType = async (name: string, supabase: SupabaseClient) => {
	const { data: apiType, error: apiTypeError } = await supabase
		.from("api_types")
		.select("*")
		.eq("name", name)
		.single();
	if (apiTypeError) {
		console.error("Error fetching api type", apiTypeError);
	}

	return apiType!;
};

export const saveApiCallToSupabase = async (
	supabase: SupabaseClient,
	apiType: string,
) => {
	try {
		const fetchedApiType = await getApiType(apiType, supabase);
		await supabase.from("api_calls").insert({
			type: fetchedApiType.id,
		});
	} catch (e) {
		console.error(e);
	}
};

const getPlanFromStripePlanId = (
	stripePlanId: string,
): "free" | "basic" | "premium" => {
	if (PREMIUM_PLAN.has(stripePlanId)) {
		return "premium";
	} else if (BASIC_PLAN.has(stripePlanId)) {
		return "basic";
	}

	return "free";
};

export const getNoterousUser = async (supabase: SupabaseClient<Database>) => {
	const { data: session, error: sessionError } =
		await supabase.auth.getSession();
	if (sessionError) {
		console.error(sessionError);
		return { error: "Error getting session: " + sessionError };
	}
	if (!session || !session.session || !session.session.user) {
		return { error: "User was not logged in" };
	}

	const lockId = `${session.session.user?.id}-fetchUser`;
	return lockManager
		.acquireLock(lockId)
		.then(async () => {
			// pUser is the user in the public.users table
			const { data: pUser, error } = await supabase
				.from("users")
				.select("*")
				.eq("user_id", session.session!.user!.id)
				.single();
			if (!pUser) {
				return { error: "User not found" };
			}

			if (pUser.isUniversityAffiliated == null) {
				// Only check the email domain once, then set it on the user table
				const getSubdomains = (domain: string) => {
					const subdomains = [domain];
					let parts = domain.split(".");
					while (parts.length > 1) {
						subdomains.push(parts.join("."));
						parts.shift();
					}
					return subdomains;
				};

				const emailDomain = pUser.email.split("@")[1];
				const subdomains = getSubdomains(emailDomain);

				let isUniversityAffiliated = false;
				for (const subdomain of subdomains) {
					const { data, error } = await supabase
						.from("school_domains")
						.select("*")
						.eq("domain", subdomain);

					if (data && data.length > 0) {
						isUniversityAffiliated = true;
						break;
					}
				}

				pUser.isUniversityAffiliated = isUniversityAffiliated;

				await serviceRoleSupabase.from("users").upsert({
					...pUser,
				});
			}

			if (!pUser.stripe_customer_id) {
				// Set the stripe customer ID
				const customer = await stripe.customers.create({
					email: pUser.email,
					metadata: {
						user_id: pUser.user_id,
					},
				});

				// Update the pUser reference to have the customer ID for the rest of the usage
				pUser.stripe_customer_id = customer.id;
				const { data: user_data, error: user_error } =
					await serviceRoleSupabase
						.from("users")
						.upsert({
							...pUser,
							stripe_customer_id: customer.id,
						})
						.match({ user_id: pUser.user_id });
				if (user_error) {
					return {
						error:
							"Error creating stripe customer: " +
							user_error.message,
					};
				}
			}

			if (pUser.stripe_customer_id) {
				// Find all the subscriptions for a user
				const subscriptions = await stripe.subscriptions.list({
					customer: pUser.stripe_customer_id,
				});

				// Sort subscriptions by current_period_end, the latest subscription will be first (the active one)
				const orderedSubscriptions = subscriptions.data
					.map((subscription) => {
						return {
							status: subscription.status,
							itemId: subscription.items.data[0].id,
							plan: getPlanFromStripePlanId(
								subscription.items.data[0].plan.id,
							),
							trial_end: subscription.trial_end,
							current_period_end: subscription.current_period_end,
						};
					})
					.sort((a, b) => {
						if (a.current_period_end === null) return 1;
						if (b.current_period_end === null) return -1;
						return b.current_period_end - a.current_period_end;
					});

				// Return the user and subscriptions
				const outputUser = {
					...(pUser as any),
					subscriptions:
						orderedSubscriptions && orderedSubscriptions.length > 0
							? orderedSubscriptions
							: [
									{
										status: "canceled",
										itemId: "",
										plan: "free",
										trial_end: null,
										current_period_end: null,
									},
							  ],
				} as NoterousUser;
				return outputUser;
			}

			// Output the user without subscriptions if we can't find any, this is equivalent of not having a subscription
			return {
				...(pUser as any),
				subscriptions: undefined,
			} as NoterousUser;
		})
		.finally(() => {
			lockManager.releaseLock(lockId);
		});
};
