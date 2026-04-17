import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { formatDate, formatCost, formatNumber } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Bot, Cpu, PlusCircle } from "lucide-react";
import Link from "next/link";
import { ProjectEditForm } from "./edit-form";
import type { Agent, Session } from "@/lib/supabase/types";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/10 text-green-600 border-green-500/20",
  paused: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  archived: "bg-muted text-muted-foreground",
};

const SESSION_STATUS_COLORS: Record<string, string> = {
  completed: "bg-green-500/10 text-green-600 border-green-500/20",
  running: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  failed: "bg-red-500/10 text-red-600 border-red-500/20",
  cancelled: "bg-muted text-muted-foreground",
};

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const t = await getTranslations("projects");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();

  if (!project) notFound();

  const [{ data: agents }, { data: sessions }] = await Promise.all([
    supabase
      .from("agents")
      .select("*")
      .eq("project_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("sessions")
      .select("*")
      .eq("project_id", id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Back + status */}
      <div className="flex items-center gap-3">
        <Link
          href={`/${locale}/projects`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("title")}
        </Link>
        <span className="text-muted-foreground">/</span>
        <Badge variant="outline" className={STATUS_COLORS[project.status]}>
          {t(`status.${project.status}`)}
        </Badge>
      </div>

      {/* Edit form */}
      <ProjectEditForm project={project} locale={locale} />

      {/* Agents */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            {t("detail.agents")}
            <span className="text-sm font-normal text-muted-foreground ml-1">
              ({agents?.length ?? 0})
            </span>
          </CardTitle>
          <Button asChild size="sm" variant="outline">
            <Link href={`/${locale}/agents/new?project_id=${id}`}>
              <PlusCircle className="h-4 w-4 mr-1.5" />
              {t("detail.newAgent")}
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {!agents || agents.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {t("detail.noAgents")}
            </p>
          ) : (
            <div className="divide-y divide-border">
              {agents.map((agent: Agent) => (
                <div
                  key={agent.id}
                  className="flex items-center justify-between py-3"
                >
                  <div>
                    <p className="text-sm font-medium">{agent.name}</p>
                    {agent.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {agent.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">
                      {agent.model}
                    </span>
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
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sessions */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-4 w-4" />
            {t("detail.sessions")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!sessions || sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {t("detail.noSessions")}
            </p>
          ) : (
            <div className="divide-y divide-border">
              {sessions.map((session: Session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between py-3"
                >
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="outline"
                      className={SESSION_STATUS_COLORS[session.status]}
                    >
                      {session.status}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(session.created_at)}
                    </span>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>{formatNumber(session.input_tokens + session.output_tokens)} tokens</p>
                    <p>{formatCost(Number(session.cost_usd))}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
