import { captureException } from "@sentry/nextjs";
import { createClient } from "@supabase/supabase-js";
import { Database } from "aws-sdk/clients/cloudwatchevents";
import { NextApiRequest, NextApiResponse } from "next/types";
import { Resend } from "resend";
import Stripe from "stripe";
import { CancellationEmail } from "../../../../packages/transactional/emails/CancellationEmail";
import { SubscriptionEmail } from "../../../../packages/transactional/emails/SubscriptionEmail";
import { BASIC_PLAN, PREMIUM_PLAN } from "../../../utils/constants/plans";
import { PostHogClient } from "../_shared/posthog";

const resend = new Resend(process.env.RESEND_API_KEY);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret =
	process.env.NODE_ENV == "production"
		? process.env.STRIPE_WEBHOOK_SECRET!
		: "whsec_26332337acf157ddd792d61e3fe0b52e15396584206f0678c1b248cf7a1677ab";

const serviceRoleSupabase = createClient<Database>(
	process.env.NEXT_PUBLIC_SUPABASE_URL!,
	process.env.SUPABASE_SERVICE_KEY!,
);

export const config = {
	api: {
		bodyParser: false,
	},
};

const getUserByCustomerId = (customerId: string) => {
	return serviceRoleSupabase
		.from("users")
		.select("*")
		.eq("stripe_customer_id", customerId)
		.maybeSingle();
};

const SOURCE_EMAIL = "Sami Sahnoune <sami@mail.vizlylabs.com>";
const EMAIL = "sami@vizlylabs.com";

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	try {
		const buffer = await new Promise<Buffer>((resolve, reject) => {
			let data = "";
			req.on("data", (chunk) => {
				data += chunk;
			});
			req.on("end", () => resolve(Buffer.from(data)));
			req.on("error", reject);
		});

		const result = buffer.toString();
		const signature = req.headers["stripe-signature"];
		if (signature) {
			const event = await stripe.webhooks.constructEvent(
				buffer,
				signature,
				webhookSecret,
			);

			switch (event.type) {
				case "checkout.session.completed":
					if (typeof event.data.object.customer === "string") {
						const { data: user, error } = await getUserByCustomerId(
							event.data.object.customer,
						);

						if (user && user.user_id) {
							await PostHogClient.trackEventData(
								user.user_id,
								"[STRIPE] " + event.type,
								{
									...event.data.object,
								},
							);
						}
						const customerEmail =
							event.data.object.customer_details?.email;
						const customerName =
							event.data.object.customer_details?.name?.split(
								" ",
							)?.[0];

						if (customerEmail) {
							const { data, error: resendError } =
								await resend.emails.send({
									from: SOURCE_EMAIL,
									to: [customerEmail],
									subject: `Hi ${
										customerName ? customerName : "there"
									} - excited to have you on board!`,
									react: SubscriptionEmail({
										firstName: customerName,
									}),
									reply_to: EMAIL,
								});
						}
					}
					break;
				case "payment_intent.canceled":
				case "invoice.payment_failed":
					break;
				case "customer.subscription.updated":
					if (event.data.object.cancel_at_period_end == true) {
						// User cancelled their subscription
						const customer = event.data.object
							.customer as Stripe.Customer;

						const customerName = customer.name?.split(" ")?.[0];

						if (customer.email) {
							const coupon = await stripe.coupons.create({
								percent_off: 50,
								duration_in_months: 3,
								max_redemptions: 1,
								applies_to: {
									products: [
										...Array.from(BASIC_PLAN),
										...Array.from(PREMIUM_PLAN.values()),
									],
								},
								id: customer.name
									? customer.name.replace(/\s/g, "-") +
									  "-50-OFF"
									: undefined,
								redeem_by: Math.floor(
									(Date.now() + 3 * 24 * 60 * 60 * 1000) /
										1000,
								),
							});

							const { data, error } = await resend.emails.send({
								from: SOURCE_EMAIL,
								to: [customer.email],
								subject: "😔 We hope this isn't goodbye",
								react: CancellationEmail({
									couponCode: coupon.id,
									firstName: customerName,
								}),
								reply_to: EMAIL,
							});
						}
					}
					break;
				default:
					break;
			}
		}

		res.status(200).json({ result });
	} catch (err) {
		captureException(err);
		console.error(err);
		res.status(500).json({ error: "failed to load data: " + err });
	}
}
