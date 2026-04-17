import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { formatNumber, formatCost } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { PLANS } from "@/lib/stripe";

const stripeConfigured = !!process.env.STRIPE_SECRET_KEY;

export default async function BillingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("billing");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (!profile) return null;

  const startOfMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1
  ).toISOString();
  const { data: sessions } = await supabase
    .from("sessions")
    .select("input_tokens, output_tokens, cost_usd")
    .eq("user_id", user.id)
    .gte("created_at", startOfMonth);

  const totalSessions = sessions?.length ?? 0;
  const totalTokens =
    sessions?.reduce((s, r) => s + r.input_tokens + r.output_tokens, 0) ?? 0;
  const totalCost =
    sessions?.reduce((s, r) => s + Number(r.cost_usd), 0) ?? 0;

  const currentPlan = profile.plan;

  async function handleUpgrade(planId: "solo" | "agency") {
    "use server";
    if (!stripeConfigured) return;

    try {
      const {
        createCheckoutSession,
        getOrCreateStripeCustomer,
      } = await import("@/lib/stripe");
      const { createClient: makeClient } = await import(
        "@/lib/supabase/server"
      );
      const supabase2 = await makeClient();
      const {
        data: { user: u },
      } = await supabase2.auth.getUser();
      if (!u) return;

      const { data: p } = await supabase2
        .from("profiles")
        .select("*")
        .eq("id", u.id)
        .single();
      if (!p) return;

      const customer = await getOrCreateStripeCustomer({
        userId: u.id,
        email: u.email!,
        name: p.full_name ?? undefined,
      });

      const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
      const session = await createCheckoutSession({
        customerId: customer.id,
        priceId: PLANS[planId].priceId!,
        successUrl: `${appUrl}/${locale}/billing?success=1`,
        cancelUrl: `${appUrl}/${locale}/billing`,
        metadata: { supabase_uid: u.id, plan: planId },
      });

      redirect(session.url!);
    } catch {
      // Redirect failures are thrown as NEXT_REDIRECT — rethrow those
      throw;
    }
  }

  async function handleManage() {
    "use server";
    if (!stripeConfigured) return;

    try {
      const { createBillingPortalSession } = await import("@/lib/stripe");
      const { createClient: makeClient } = await import(
        "@/lib/supabase/server"
      );
      const supabase2 = await makeClient();
      const {
        data: { user: u },
      } = await supabase2.auth.getUser();
      if (!u) return;

      const { data: p } = await supabase2
        .from("profiles")
        .select("stripe_customer_id")
        .eq("id", u.id)
        .single();
      if (!p?.stripe_customer_id) return;

      const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
      const portal = await createBillingPortalSession({
        customerId: p.stripe_customer_id,
        returnUrl: `${appUrl}/${locale}/billing`,
      });
      redirect(portal.url);
    } catch {
      throw;
    }
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      {/* Stripe not configured notice */}
      {!stripeConfigured && (
        <div className="flex items-start gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5 px-4 py-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-400">
              {t("notConfigured")}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t("notConfiguredDesc")}
            </p>
          </div>
        </div>
      )}

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle>{t("currentPlan")}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge className="capitalize text-base px-3 py-1">{currentPlan}</Badge>
            {profile.subscription_status && (
              <span className="text-sm text-muted-foreground capitalize">
                {profile.subscription_status}
              </span>
            )}
          </div>
          {currentPlan !== "free" && stripeConfigured && (
            <form action={handleManage}>
              <Button variant="outline" type="submit">
                {t("manage")}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Usage */}
      <Card>
        <CardHeader>
          <CardTitle>{t("usage")}</CardTitle>
          <CardDescription>
            {profile.api_quota_used} / {profile.api_quota_limit} quota used
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-muted-foreground">{t("sessions")}</p>
            <p className="text-2xl font-bold mt-1">{formatNumber(totalSessions)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t("tokens")}</p>
            <p className="text-2xl font-bold mt-1">{formatNumber(totalTokens)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t("cost")}</p>
            <p className="text-2xl font-bold mt-1">{formatCost(totalCost)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Upgrade plans (only if on free tier and Stripe is configured) */}
      {currentPlan === "free" && stripeConfigured && (
        <div>
          <h2 className="text-lg font-semibold mb-4">{t("upgrade")}</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {(["solo", "agency"] as const).map((plan) => (
              <Card key={plan} className={plan === "solo" ? "border-primary" : ""}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {PLANS[plan].name}
                    {plan === "solo" && <Badge>Most popular</Badge>}
                  </CardTitle>
                  <CardDescription>
                    {plan === "solo" ? "$29/mo" : "$99/mo"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {PLANS[plan].features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <form action={handleUpgrade.bind(null, plan)}>
                    <Button
                      type="submit"
                      className="w-full"
                      variant={plan === "solo" ? "default" : "outline"}
                    >
                      Upgrade to {PLANS[plan].name}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
