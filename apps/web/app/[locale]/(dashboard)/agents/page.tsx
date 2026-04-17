import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { Bot, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { MODELS, type ModelId } from "@/lib/claude";

export default async function AgentsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("agents");
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: agents } = await supabase
    .from("agents")
    .select("*, projects!inner(name, owner_id)")
    .eq("projects.owner_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Button asChild>
          <Link href={`/${locale}/agents/new`}>
            <PlusCircle className="h-4 w-4 mr-2" />
            {t("new")}
          </Link>
        </Button>
      </div>

      {!agents || agents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20 gap-4">
            <Bot className="h-12 w-12 text-muted-foreground/50" />
            <div className="text-center">
              <p className="font-medium">{t("empty")}</p>
              <p className="text-sm text-muted-foreground mt-1">{t("emptyDesc")}</p>
            </div>
            <Button asChild>
              <Link href={`/${locale}/agents/new`}>{t("new")}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {agents.map((agent) => {
            const modelLabel =
              MODELS[agent.model as ModelId]?.label ?? agent.model;
            return (
              <Card
                key={agent.id}
                className="hover:border-primary/50 transition-colors cursor-pointer"
              >
                <CardContent className="p-6 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{agent.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {(agent as { projects: { name: string } }).projects.name}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        agent.status === "active"
                          ? "bg-green-500/10 text-green-600 border-green-500/20"
                          : ""
                      }
                    >
                      {agent.status}
                    </Badge>
                  </div>
                  {agent.description && (
                    <p className="text-sm text-muted-foreground">{agent.description}</p>
                  )}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-mono">{modelLabel}</span>
                    <span>{formatDate(agent.created_at)}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
