import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { formatDate } from "@/lib/utils";
import { PlusCircle, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import type { Project } from "@/lib/supabase/types";

const STATUS_COLORS: Record<Project["status"], string> = {
  active: "bg-green-500/10 text-green-600 border-green-500/20",
  paused: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  archived: "bg-muted text-muted-foreground",
};

export default async function ProjectsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("projects");
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Button asChild>
          <Link href={`/${locale}/projects/new`}>
            <PlusCircle className="h-4 w-4 mr-2" />
            {t("new")}
          </Link>
        </Button>
      </div>

      {!projects || projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20 gap-4">
            <FolderOpen className="h-12 w-12 text-muted-foreground/50" />
            <div className="text-center">
              <p className="font-medium">{t("empty")}</p>
              <p className="text-sm text-muted-foreground mt-1">{t("emptyDesc")}</p>
            </div>
            <Button asChild>
              <Link href={`/${locale}/projects/new`}>{t("new")}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {projects.map((project) => (
            <Link key={project.id} href={`/${locale}/projects/${project.id}`}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                <CardContent className="flex items-center justify-between p-6">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold">{project.name}</h3>
                      <Badge
                        variant="outline"
                        className={STATUS_COLORS[project.status]}
                      >
                        {t(`status.${project.status}`)}
                      </Badge>
                    </div>
                    {project.description && (
                      <p className="text-sm text-muted-foreground">
                        {project.description}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(project.created_at)}
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
