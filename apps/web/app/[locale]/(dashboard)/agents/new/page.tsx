"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { MODELS } from "@/lib/claude";
import type { Project } from "@/lib/supabase/types";

export default function NewAgentPage() {
  const t = useTranslations("agents");
  const params = useParams();
  const locale = params.locale as string;
  const router = useRouter();
  const searchParams = useSearchParams();

  const [projects, setProjects] = useState<Project[]>([]);
  const [form, setForm] = useState({
    name: "",
    description: "",
    project_id: searchParams.get("project_id") ?? "",
    model: "claude-sonnet-4-6",
    system_prompt: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update(field: keyof typeof form) {
    return (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  useEffect(() => {
    async function loadProjects() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("projects")
        .select("*")
        .eq("owner_id", user.id)
        .eq("status", "active")
        .order("name");

      if (data) setProjects(data);
    }
    loadProjects();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.project_id) {
      setError("Please select a project.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { error } = await supabase.from("agents").insert({
      project_id: form.project_id,
      name: form.name,
      description: form.description || null,
      model: form.model,
      system_prompt: form.system_prompt || null,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push(`/${locale}/agents`);
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <Link
        href={`/${locale}/agents`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("title")}
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>{t("new")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Project selector */}
            <div className="space-y-2">
              <Label htmlFor="project_id">{t("form.project")}</Label>
              <select
                id="project_id"
                value={form.project_id}
                onChange={update("project_id")}
                required
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="" disabled>
                  {t("form.projectPlaceholder")}
                </option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">{t("form.name")}</Label>
              <Input
                id="name"
                value={form.name}
                onChange={update("name")}
                placeholder="Code Reviewer"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">{t("form.description")}</Label>
              <Input
                id="description"
                value={form.description}
                onChange={update("description")}
                placeholder="Reviews pull requests and suggests improvements"
              />
            </div>

            {/* Model */}
            <div className="space-y-2">
              <Label htmlFor="model">{t("form.model")}</Label>
              <select
                id="model"
                value={form.model}
                onChange={update("model")}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {Object.entries(MODELS).map(([id, { label }]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* System prompt */}
            <div className="space-y-2">
              <Label htmlFor="system_prompt">{t("form.systemPrompt")}</Label>
              <Textarea
                id="system_prompt"
                value={form.system_prompt}
                onChange={update("system_prompt")}
                placeholder="You are a senior software engineer specializing in code review…"
                rows={4}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "…" : t("form.submit")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
