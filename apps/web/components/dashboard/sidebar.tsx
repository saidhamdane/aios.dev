"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  FolderOpen,
  Bot,
  CreditCard,
  Settings,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { key: "dashboard", href: "/dashboard", icon: LayoutDashboard },
  { key: "projects", href: "/projects", icon: FolderOpen },
  { key: "agents", href: "/agents", icon: Bot },
  { key: "billing", href: "/billing", icon: CreditCard },
  { key: "settings", href: "/settings", icon: Settings },
] as const;

export function Sidebar({ locale }: { locale: string }) {
  const pathname = usePathname();
  const t = useTranslations("nav");

  return (
    <aside className="w-60 border-r border-border flex flex-col bg-card shrink-0">
      {/* Logo */}
      <div className="h-16 border-b border-border flex items-center px-6">
        <Link href={`/${locale}`} className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg tracking-tight">AIOS</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ key, href, icon: Icon }) => {
          const fullHref = `/${locale}${href}`;
          const isActive =
            pathname === fullHref ||
            (href !== "/dashboard" && pathname.startsWith(fullHref));

          return (
            <Link
              key={key}
              href={fullHref}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {t(key)}
            </Link>
          );
        })}
      </nav>

      {/* Docs link */}
      <div className="px-3 pb-4 border-t border-border pt-3">
        <a
          href="https://github.com/saidhamdane/aios.dev"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">CLI</span>
          npm i -g @aios/cli
        </a>
      </div>
    </aside>
  );
}
