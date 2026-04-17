export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          plan: "free" | "solo" | "agency";
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          subscription_status: string | null;
          api_quota_used: number;
          api_quota_limit: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["profiles"]["Row"], "created_at" | "updated_at"> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          owner_id: string;
          plan: "agency";
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          subscription_status: string | null;
          member_limit: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["organizations"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["organizations"]["Insert"]>;
      };
      org_members: {
        Row: {
          id: string;
          org_id: string;
          user_id: string;
          role: "owner" | "admin" | "member";
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["org_members"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["org_members"]["Insert"]>;
      };
      projects: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          owner_id: string | null;
          org_id: string | null;
          status: "active" | "paused" | "archived";
          config: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["projects"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["projects"]["Insert"]>;
      };
      agents: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          description: string | null;
          model: string;
          system_prompt: string | null;
          tools: Json;
          config: Json;
          status: "active" | "inactive";
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["agents"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["agents"]["Insert"]>;
      };
      sessions: {
        Row: {
          id: string;
          project_id: string;
          agent_id: string | null;
          user_id: string;
          status: "running" | "completed" | "failed" | "cancelled";
          input_tokens: number;
          output_tokens: number;
          cost_usd: number;
          metadata: Json;
          started_at: string;
          ended_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["sessions"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["sessions"]["Insert"]>;
      };
      api_keys: {
        Row: {
          id: string;
          owner_id: string | null;
          org_id: string | null;
          name: string;
          key_hash: string;
          key_prefix: string;
          last_used_at: string | null;
          expires_at: string | null;
          permissions: Json;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["api_keys"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["api_keys"]["Insert"]>;
      };
    };
  };
};

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Organization = Database["public"]["Tables"]["organizations"]["Row"];
export type OrgMember = Database["public"]["Tables"]["org_members"]["Row"];
export type Project = Database["public"]["Tables"]["projects"]["Row"];
export type Agent = Database["public"]["Tables"]["agents"]["Row"];
export type Session = Database["public"]["Tables"]["sessions"]["Row"];
export type ApiKey = Database["public"]["Tables"]["api_keys"]["Row"];
