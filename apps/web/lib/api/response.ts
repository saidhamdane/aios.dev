import { NextResponse } from "next/server";

export interface AgentResponse<T = unknown> {
  success: boolean;
  data: T | null;
  error: string | null;
  metadata: {
    timestamp: string;
    version: string;
    requestId: string;
  };
}

export function ok<T>(data: T, status = 200): NextResponse<AgentResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      error: null,
      metadata: buildMeta(),
    },
    { status }
  );
}

export function err(message: string, status = 400): NextResponse<AgentResponse<null>> {
  return NextResponse.json(
    {
      success: false,
      data: null,
      error: message,
      metadata: buildMeta(),
    },
    { status }
  );
}

function buildMeta() {
  return {
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    requestId: crypto.randomUUID(),
  };
}
