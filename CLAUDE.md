# AIOS — Agency OS for Claude Code

## Project Overview
AIOS is a meta-layer on top of Claude Code that transforms it from a solo tool into infrastructure for agencies and enterprises. It provides project management, multi-agent orchestration, billing, and an Agent-Ready API.

## Stack
- **Web**: Next.js 14 (App Router) + Supabase + Stripe + Claude API
- **UI**: Tailwind CSS + shadcn/ui + next-intl (EN/ES/AR RTL)
- **CLI**: `@aios/cli` — Node.js wrapper around `claude` command
- **Hosting**: Hostinger VPS + PM2 + Cloudflare
- **Monorepo**: pnpm workspaces + Turborepo

## Repo Structure
```
apps/web/        Next.js 14 application
packages/cli/    @aios/cli npm package
supabase/        Database migrations and seed data
```

## Development
```bash
pnpm install
pnpm dev
```

## Key Conventions
- All API routes under `/api/v1/` return AgentResponse<T> (semantic JSON + metadata)
- Auth via Supabase SSR — use `createServerClient` in server components/routes
- i18n via next-intl — all user-facing strings must be in messages/*.json
- RTL support for Arabic via `dir` attribute on `<html>`
- Plans: `free` | `solo` | `agency` — enforce limits in middleware

## Environment Variables
See `apps/web/.env.example` for required variables.

## Current Phase
Phase 1 — Solo/Agency tier. ComplianceOS and Marketplace are Phase 7+.
