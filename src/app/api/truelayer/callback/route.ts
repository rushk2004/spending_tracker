import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  exchangeCode,
  encryptToken,
  isTrueLayerConfigured,
} from "@/lib/truelayer";
import { syncBankConnection } from "@/lib/bank-sync";

function errorRedirect(origin: string, code: string, detail?: string) {
  const params = new URLSearchParams({ bank_error: code });
  if (detail) params.set("bank_detail", detail.slice(0, 240));
  return NextResponse.redirect(`${origin}/settings?${params.toString()}`);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const errorDesc = url.searchParams.get("error_description");

  const origin = url.origin;
  if (error) {
    return errorRedirect(origin, error, errorDesc || undefined);
  }

  const cookieStore = cookies();
  const expected = cookieStore.get("tl_oauth_state")?.value;
  const userId = cookieStore.get("tl_oauth_user")?.value;

  if (!code || !state || !expected || state !== expected || !userId) {
    return errorRedirect(
      origin,
      "invalid_state",
      "OAuth session expired or mismatched. Please try Connect bank again."
    );
  }

  if (!isTrueLayerConfigured()) {
    return errorRedirect(
      origin,
      "not_configured",
      "TRUELAYER_CLIENT_ID / TRUELAYER_CLIENT_SECRET are missing on the server."
    );
  }

  try {
    const tokens = await exchangeCode(code);
    const conn = await prisma.bankConnection.create({
      data: {
        userId,
        provider: "truelayer",
        accessTokenEnc: encryptToken(tokens.access_token),
        refreshTokenEnc: tokens.refresh_token ? encryptToken(tokens.refresh_token) : null,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        institutionName: "Connected bank",
        status: "active",
      },
    });

    await syncBankConnection(conn.id, userId);

    cookieStore.delete("tl_oauth_state");
    cookieStore.delete("tl_oauth_user");

    return NextResponse.redirect(`${origin}/dashboard?connected=1`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "sync_failed";
    const friendly = msg.includes("Token exchange")
      ? "Could not exchange authorization code. Check Client ID/Secret, TRUELAYER_ENV=live, and that the redirect URI matches the TrueLayer Console exactly."
      : msg;
    return errorRedirect(origin, "connect_failed", friendly);
  }
}
