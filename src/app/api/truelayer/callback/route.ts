import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  exchangeCode,
  encryptToken,
  isTrueLayerConfigured,
} from "@/lib/truelayer";
import { syncBankConnection } from "@/lib/bank-sync";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const origin = url.origin;
  if (error) {
    return NextResponse.redirect(`${origin}/settings?bank_error=${encodeURIComponent(error)}`);
  }

  const cookieStore = cookies();
  const expected = cookieStore.get("tl_oauth_state")?.value;
  const userId = cookieStore.get("tl_oauth_user")?.value;

  if (!code || !state || !expected || state !== expected || !userId) {
    return NextResponse.redirect(`${origin}/settings?bank_error=invalid_state`);
  }

  if (!isTrueLayerConfigured()) {
    return NextResponse.redirect(`${origin}/settings?bank_error=not_configured`);
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

    return NextResponse.redirect(`${origin}/accounts?connected=1`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "sync_failed";
    return NextResponse.redirect(`${origin}/settings?bank_error=${encodeURIComponent(msg)}`);
  }
}
