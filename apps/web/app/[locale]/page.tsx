import { useTranslations } from "next-intl";
import Link from "next/link";
import { getLocale } from "next-intl/server";
import { ArrowRight, Zap, Globe, Code2, BarChart3, Key, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function LandingPage() {
  const locale = await getLocale();

  return <LandingContent locale={locale} />;
}

function LandingContent({ locale }: { locale: string }) {
  const t = useTranslations("landing");
  const tPricing = useTranslations("landing.pricing");

  const features = [
    { key: "projects", icon: BarChart3 },
    { key: "agents", icon: Bot },
    { key: "api", icon: Code2 },
    { key: "i18n", icon: Globe },
    { key: "billing", icon: Key },
    { key: "cli", icon: Zap },
  ] as const;

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border/40 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="container flex items-center justify-between h-16">
          <span className="font-bold text-xl tracking-tight">AIOS</span>
          <div className="flex items-center gap-4">
            <Link
              href={`/${locale}/login`}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign in
            </Link>
            <Button asChild size="sm">
              <Link href={`/${locale}/register`}>Get started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="container pt-24 pb-20 text-center">
        <Badge variant="secondary" className="mb-6">
          {t("hero.badge")}
        </Badge>
        <h1 className="text-5xl font-bold tracking-tight mb-6 max-w-3xl mx-auto leading-tight">
          {t("hero.headline")}
        </h1>
        <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
          {t("hero.subheadline")}
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Button asChild size="lg" className="gap-2">
            <Link href={`/${locale}/register`}>
              {t("hero.cta")} <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <span className="text-sm text-muted-foreground">{t("hero.ctaSub")}</span>
        </div>

        {/* CLI hint */}
        <div className="mt-12 inline-flex items-center gap-3 bg-muted/50 rounded-lg px-6 py-3 text-sm font-mono">
          <span className="text-muted-foreground">$</span>
          <span>npm i -g @aios/cli</span>
          <span className="text-muted-foreground">&&</span>
          <span>aios init</span>
        </div>
      </section>

      {/* Features */}
      <section className="container py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">{t("features.title")}</h2>
          <p className="text-muted-foreground text-lg">{t("features.subtitle")}</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ key, icon: Icon }) => (
            <div
              key={key}
              className="border border-border rounded-xl p-6 hover:border-primary/50 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">
                {t(`features.items.${key}.title`)}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t(`features.items.${key}.desc`)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="container py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">{tPricing("title")}</h2>
          <p className="text-muted-foreground text-lg">{tPricing("subtitle")}</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {(["free", "solo", "agency"] as const).map((plan) => (
            <div
              key={plan}
              className={`border rounded-xl p-8 relative ${
                plan === "solo"
                  ? "border-primary shadow-lg shadow-primary/10"
                  : "border-border"
              }`}
            >
              {plan === "solo" && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                  {tPricing("solo.badge")}
                </Badge>
              )}
              <div className="mb-6">
                <p className="font-semibold text-lg mb-1">
                  {tPricing(`${plan}.name`)}
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{tPricing(`${plan}.price`)}</span>
                  <span className="text-muted-foreground">{tPricing(`${plan}.period`)}</span>
                </div>
              </div>
              <PlanFeatures plan={plan} />
              <Button
                asChild
                className="w-full mt-6"
                variant={plan === "solo" ? "default" : "outline"}
              >
                <Link href={`/${locale}/register`}>{tPricing(`${plan}.cta`)}</Link>
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10 mt-10">
        <div className="container flex items-center justify-between text-sm text-muted-foreground">
          <span>© 2025 AIOS. Built on Claude Code.</span>
          <div className="flex gap-6">
            <Link href="/en/login" className="hover:text-foreground transition-colors">
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function PlanFeatures({ plan }: { plan: "free" | "solo" | "agency" }) {
  const features: Record<string, string[]> = {
    free: ["50 sessions/mo", "1 project", "Community support"],
    solo: ["1,000 sessions/mo", "Unlimited projects", "API access", "Email support"],
    agency: ["10,000 sessions/mo", "Team (up to 5)", "Priority support", "Custom agents", "Webhooks"],
  };

  return (
    <ul className="space-y-2">
      {features[plan].map((f) => (
        <li key={f} className="flex items-center gap-2 text-sm">
          <span className="text-primary">✓</span>
          <span>{f}</span>
        </li>
      ))}
    </ul>
  );
}
