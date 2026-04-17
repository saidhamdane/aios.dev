import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { formatNumber, formatCost } from "@/lib/utils";
import { FolderOpen, Cpu, Bot, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("dashboard");
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: projects }, { data: sessions }, { data: agents }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("projects").select("id").eq("owner_id", user.id).eq("status", "active"),
      supabase
        .from("sessions")
        .select("cost_usd, input_tokens, output_tokens")
        .eq("user_id", user.id)
        .gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
      supabase
        .from("agents")
        .select("id, project_id, projects!inner(owner_id)")
        .eq("projects.owner_id", user.id),
    ]);

  const totalCost = sessions?.reduce((sum, s) => sum + Number(s.cost_usd), 0) ?? 0;
  const totalTokens = sessions?.reduce(
    (sum, s) => sum + s.input_tokens + s.output_tokens,
    0
  ) ?? 0;

  const stats = [
    {
      label: t("stats.projects"),
      value: formatNumber(projects?.length ?? 0),
      icon: FolderOpen,
    },
    {
      label: t("stats.sessions"),
      value: formatNumber(sessions?.length ?? 0),
      icon: Cpu,
    },
    {
      label: t("stats.agents"),
      value: formatNumber(agents?.length ?? 0),
      icon: Bot,
    },
    {
      label: t("stats.cost"),
      value: formatCost(totalCost),
      icon: DollarSign,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">
          {t("welcome", { name: profile?.full_name?.split(" ")[0] ?? "there" })}
        </h1>
        <p className="text-muted-foreground mt-1">
          {new Date().toLocaleDateString(locale, {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {label}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Sessions */}
      <div>
        <h2 className="text-lg font-semibold mb-4">{t("recentSessions")}</h2>
        <Card>
          <CardContent className="p-0">
            {!sessions || sessions.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">
                No sessions yet. Install @aios/cli and run{" "}
                <code className="bg-muted px-1 rounded">aios run</code> to start.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {sessions.slice(0, 10).map((s, i) => (
                  <div key={i} className="flex items-center justify-between px-6 py-4 text-sm">
                    <span className="text-muted-foreground">
                      {formatNumber(s.input_tokens + s.output_tokens)} tokens
                    </span>
                    <span className="font-medium">{formatCost(Number(s.cost_usd))}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
