import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { requireUser } from "@/lib/session";
import { buildConnectUrl, isTrueLayerConfigured } from "@/lib/truelayer";
import { createMockConnection } from "@/lib/bank-sync";

export async function GET(req: Request) {
  const session = await requireUser();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const mode = url.searchParams.get("mode");
  const institution = (url.searchParams.get("institution") || "revolut") as
    | "revolut"
    | "monzo"
    | "starling";

  if (mode === "mock" || url.searchParams.get("demo") === "1") {
    await createMockConnection(session.userId, institution);
    return NextResponse.redirect(new URL("/accounts?connected=1", url.origin));
  }

  if (!isTrueLayerConfigured()) {
    return NextResponse.json({
      configured: false,
      mock: true,
      message: "TrueLayer credentials missing — use mock connect for UK bank demo.",
    });
  }

  const state = crypto.randomBytes(16).toString("hex");
  cookies().set("tl_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
  });
  cookies().set("tl_oauth_user", session.userId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
  });

  return NextResponse.redirect(buildConnectUrl(state));
}

export async function POST(req: Request) {
  const session = await requireUser();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const institution = (body.institution || "revolut") as "revolut" | "monzo" | "starling";

  if (body.mode === "mock" || !isTrueLayerConfigured()) {
    const result = await createMockConnection(session.userId, institution);
    return NextResponse.json({ ok: true, ...result, provider: "mock" });
  }

  const state = crypto.randomBytes(16).toString("hex");
  cookies().set("tl_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
  });
  cookies().set("tl_oauth_user", session.userId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
  });

  return NextResponse.json({ ok: true, url: buildConnectUrl(state) });
}
