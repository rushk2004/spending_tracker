import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { requireUser } from "@/lib/session";
import { buildConnectUrl, isTrueLayerConfigured, getTrueLayerEnv, getRedirectUri } from "@/lib/truelayer";

const MISSING_CREDS =
  "TrueLayer is not configured. Add TRUELAYER_CLIENT_ID and TRUELAYER_CLIENT_SECRET (live) to your environment, set TRUELAYER_ENV=live, and register your redirect URI in the TrueLayer Console.";

export async function GET() {
  const session = await requireUser();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isTrueLayerConfigured()) {
    return NextResponse.json(
      {
        configured: false,
        error: "not_configured",
        message: MISSING_CREDS,
        env: getTrueLayerEnv(),
        redirectUri: getRedirectUri(),
      },
      { status: 503 }
    );
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

  await req.json().catch(() => ({}));

  if (!isTrueLayerConfigured()) {
    return NextResponse.json(
      {
        configured: false,
        error: "not_configured",
        message: MISSING_CREDS,
        env: getTrueLayerEnv(),
        redirectUri: getRedirectUri(),
      },
      { status: 503 }
    );
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

  return NextResponse.json({
    ok: true,
    url: buildConnectUrl(state),
    env: getTrueLayerEnv(),
  });
}
