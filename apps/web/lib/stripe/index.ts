import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-10-28.acacia",
  typescript: true,
});

export const PLANS = {
  free: {
    name: "Free",
    priceId: null,
    quotaLimit: 50,
    features: ["50 sessions/mo", "1 project", "Community support"],
  },
  solo: {
    name: "Solo",
    priceId: process.env.STRIPE_SOLO_PRICE_ID!,
    quotaLimit: 1000,
    features: [
      "1,000 sessions/mo",
      "Unlimited projects",
      "API access",
      "Email support",
    ],
  },
  agency: {
    name: "Agency",
    priceId: process.env.STRIPE_AGENCY_PRICE_ID!,
    quotaLimit: 10000,
    features: [
      "10,000 sessions/mo",
      "Team management (up to 5)",
      "Priority support",
      "Custom agents",
      "Webhook integrations",
    ],
  },
} as const;

export type PlanId = keyof typeof PLANS;

export async function createCheckoutSession({
  customerId,
  priceId,
  successUrl,
  cancelUrl,
  metadata,
}: {
  customerId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}) {
  return stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: "subscription",
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata,
    subscription_data: { metadata: metadata ?? {} },
  });
}

export async function createBillingPortalSession({
  customerId,
  returnUrl,
}: {
  customerId: string;
  returnUrl: string;
}) {
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}

export async function getOrCreateStripeCustomer({
  userId,
  email,
  name,
}: {
  userId: string;
  email: string;
  name?: string;
}) {
  const existing = await stripe.customers.search({
    query: `metadata['supabase_uid']:'${userId}'`,
    limit: 1,
  });

  if (existing.data.length > 0) return existing.data[0];

  return stripe.customers.create({
    email,
    name,
    metadata: { supabase_uid: userId },
  });
}
