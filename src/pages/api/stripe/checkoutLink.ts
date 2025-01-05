import { captureException } from "@sentry/nextjs";
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";
import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { getNoterousUser } from "../_shared/supabaseUtils";

const stripe = new Stripe(process.env.STRIPE_KEY!);

export type StripeResponseData = {
	checkout?: Stripe.Response<Stripe.Checkout.Session>;
	error?: string;
};

const UNIVERSITY_COUPON_ID = "1BORBSPl";

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse<StripeResponseData>,
) {
	const { returnUrl, priceId } = req.body;
	const supabase = createPagesServerClient({ req, res });
	const noterousUser = await getNoterousUser(supabase);
	if ("error" in noterousUser) {
		res.status(400).json({ error: noterousUser.error as string });
		return;
	}

	try {
		const discounts = noterousUser.isUniversityAffiliated
			? [{ coupon: UNIVERSITY_COUPON_ID }]
			: [];

		let stripePayload: any = {
			success_url: returnUrl,
			line_items: [
				{
					price: priceId,
					quantity: 1,
				},
			],
			customer: noterousUser.stripe_customer_id,
			mode: "subscription",
		};

		if (discounts.length) {
			stripePayload["discounts"] = discounts;
		} else {
			stripePayload["allow_promotion_codes"] = true;
		}

		const stripeSession = await stripe.checkout.sessions.create(
			stripePayload,
		);
		res.status(200).json({ checkout: stripeSession });
	} catch (error) {
		captureException(error);
		console.error(error);
		res.status(400).json({
			error: "Could not start Stripe portal: " + error,
		});
	}
}
