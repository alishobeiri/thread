import { captureException } from "@sentry/nextjs";
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";
import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_KEY!);

export type StripeResponseData = {
	portal?: Stripe.Response<Stripe.BillingPortal.Session>;
	error?: string;
};

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse<StripeResponseData>,
) {
	const { returnUrl } = req.body;
	const supabase = createPagesServerClient({ req, res });
	const { data: session, error } = await supabase.auth.getSession();
	if (error || !session || !session.session) {
		res.status(400).json({ error: "Could not get session!" });
	}

	const user = session.session!.user;
	const stripeCustomerId = await supabase
		.from("users")
		.select("stripe_customer_id")
		.eq("user_id", user.id)
		.single();

	try {
		const stripeSession = await stripe.billingPortal.sessions.create({
			customer: stripeCustomerId.data!.stripe_customer_id!,
			return_url: returnUrl,
		});
		res.status(200).json({ portal: stripeSession });
	} catch (error) {
		captureException(error);
		console.error(error);
		res.status(400).json({
			error: "Could not start Stripe portal: " + error,
		});
	}
}
