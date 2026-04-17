"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { generateApiKey, hashApiKey } from "@/lib/api/auth-client";
import { formatDate } from "@/lib/utils";
import { Copy, Trash2, Plus, Check } from "lucide-react";
import type { ApiKey, Profile } from "@/lib/supabase/types";

export default function SettingsPage() {
  const t = useTranslations("settings");
  const params = useParams();
  const locale = params.locale as string;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [fullName, setFullName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [creatingKey, setCreatingKey] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (p) { setProfile(p); setFullName(p.full_name ?? ""); }

      const { data: keys } = await supabase
        .from("api_keys")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });
      if (keys) setApiKeys(keys);
    }
    load();
  }, []);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("profiles").update({ full_name: fullName }).eq("id", user.id);
    setSavingProfile(false);
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  }

  async function createApiKey(e: React.FormEvent) {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    setCreatingKey(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { raw, prefix } = generateApiKey();
    const keyHash = await hashApiKey(raw);

    const { data: key } = await supabase
      .from("api_keys")
      .insert({ owner_id: user.id, name: newKeyName, key_hash: keyHash, key_prefix: prefix })
      .select()
      .single();

    if (key) {
      setApiKeys((prev) => [key, ...prev]);
      setCreatedKey(raw);
      setNewKeyName("");
    }
    setCreatingKey(false);
  }

  async function deleteKey(id: string) {
    await supabase.from("api_keys").delete().eq("id", id);
    setApiKeys((prev) => prev.filter((k) => k.id !== id));
  }

  async function copyKey() {
    if (!createdKey) return;
    await navigator.clipboard.writeText(createdKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle>{t("profile")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveProfile} className="space-y-4">
            <div className="space-y-2">
              <Label>{t("profileForm.fullName")}</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("profileForm.email")}</Label>
              <Input value={profile?.email ?? ""} disabled />
            </div>
            <Button type="submit" disabled={savingProfile}>
              {profileSaved ? (
                <><Check className="h-4 w-4 mr-2" />Saved</>
              ) : (
                t("profileForm.submit")
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* API Keys */}
      <Card>
        <CardHeader>
          <CardTitle>{t("apiKeys")}</CardTitle>
          <CardDescription>
            Use these keys to authenticate @aios/cli and API calls.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {createdKey && (
            <div className="bg-muted rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium text-green-600">
                {t("apiKeysSection.created")}
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-background rounded px-3 py-2 border overflow-x-auto">
                  {createdKey}
                </code>
                <Button size="sm" variant="outline" onClick={copyKey}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}

          <form onSubmit={createApiKey} className="flex gap-2">
            <Input
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder={t("apiKeysSection.namePlaceholder")}
              className="flex-1"
            />
            <Button type="submit" disabled={creatingKey}>
              <Plus className="h-4 w-4 mr-2" />
              {t("apiKeysSection.create")}
            </Button>
          </form>

          {apiKeys.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <p>{t("apiKeysSection.empty")}</p>
              <p className="mt-1">{t("apiKeysSection.emptyDesc")}</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {apiKeys.map((key) => (
                <div key={key.id} className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-medium text-sm">{key.name}</p>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">
                      {key.key_prefix}••••••••
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Created {formatDate(key.created_at)}
                      {key.last_used_at && ` · Last used ${formatDate(key.last_used_at)}`}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => deleteKey(key.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
