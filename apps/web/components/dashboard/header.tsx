"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, Globe } from "lucide-react";
import Link from "next/link";
import type { Profile } from "@/lib/supabase/types";

const PLAN_COLORS: Record<string, string> = {
  free: "bg-muted text-muted-foreground",
  solo: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  agency: "bg-purple-500/10 text-purple-600 border-purple-500/20",
};

const LOCALES = [
  { code: "en", label: "EN" },
  { code: "es", label: "ES" },
  { code: "ar", label: "AR" },
];

export function Header({
  profile,
  locale,
}: {
  profile: Profile | null;
  locale: string;
}) {
  const router = useRouter();
  const t = useTranslations("nav");

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push(`/${locale}/login`);
    router.refresh();
  }

  return (
    <header className="h-16 border-b border-border flex items-center justify-between px-6 shrink-0">
      <div />
      <div className="flex items-center gap-3">
        {/* Locale switcher */}
        <div className="flex items-center gap-1 text-xs">
          <Globe className="h-3.5 w-3.5 text-muted-foreground mr-1" />
          {LOCALES.map((l) => (
            <Link
              key={l.code}
              href={`/${l.code}/dashboard`}
              className={`px-1.5 py-0.5 rounded transition-colors ${
                locale === l.code
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* Plan badge */}
        {profile?.plan && (
          <Badge
            variant="outline"
            className={`capitalize ${PLAN_COLORS[profile.plan]}`}
          >
            {profile.plan}
          </Badge>
        )}

        {/* User */}
        <span className="text-sm text-muted-foreground hidden sm:block">
          {profile?.full_name ?? profile?.email}
        </span>

        <Button size="sm" variant="ghost" onClick={signOut} className="gap-2">
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:block">{t("signOut")}</span>
        </Button>
      </div>
    </header>
  );
}
