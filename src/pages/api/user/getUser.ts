import { captureException } from "@sentry/nextjs";
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";
import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { NoterousUser } from "../../../services/connection/connectionManager";
import { Database } from "../../../types/database.types";
import { getNoterousUser } from "../_shared/supabaseUtils";

const stripe = new Stripe(process.env.STRIPE_KEY!);

type Subscription = {
	status: Stripe.Subscription.Status;
	trial_end: number | null;
	current_period_end: number | null;
};

export type StripeResponseData = {
	subscriptions?: Subscription[];
	error?: string;
};

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse<NoterousUser | { error: string }>,
) {
	try {
		const supabase = createPagesServerClient<Database>({ req, res });

		const { data, error } = await supabase.auth.getSession();
		const session = data.session;
		if (!session || !session.user) {
			res.status(400).json({ error: "User was not logged in" });
		} else {
			const noterousUser = await getNoterousUser(supabase);
			if ("error" in noterousUser) {
				res.status(400).json({ error: noterousUser.error as string });
			} else {
				res.status(200).json(noterousUser);
			}
		}
	} catch (error) {
		captureException(error);
		res.status(400).json({
			error: "Ran into error getting user: " + error,
		});
	}
}
