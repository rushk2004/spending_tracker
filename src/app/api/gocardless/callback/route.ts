import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  encryptSecret,
  getRequisition,
  isGoCardlessConfigured,
} from "@/lib/gocardless";
import { syncBankConnection } from "@/lib/bank-sync";

function errorRedirect(origin: string, code: string, detail?: string) {
  const params = new URLSearchParams({ bank_error: code });
  if (detail) params.set("bank_detail", detail.slice(0, 240));
  return NextResponse.redirect(`${origin}/settings?${params.toString()}`);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = url.origin;
  const error = url.searchParams.get("error");
  const errorDesc = url.searchParams.get("error_description") || url.searchParams.get("details");

  if (error) {
    return errorRedirect(origin, error, errorDesc || undefined);
  }

  const cookieStore = cookies();
  const requisitionId = cookieStore.get("gc_requisition_id")?.value;
  const userId = cookieStore.get("gc_oauth_user")?.value;
  const institutionName = cookieStore.get("gc_institution_name")?.value || "Connected bank";
  const institutionId = cookieStore.get("gc_institution_id")?.value || null;

  if (!requisitionId || !userId) {
    return errorRedirect(
      origin,
      "invalid_state",
      "Bank connect session expired. Please pick your bank and try again."
    );
  }

  if (!isGoCardlessConfigured()) {
    return errorRedirect(
      origin,
      "not_configured",
      "GOCARDLESS_SECRET_ID / GOCARDLESS_SECRET_KEY are missing on the server."
    );
  }

  try {
    const requisition = await getRequisition(requisitionId);
    // LN = Linked / successful
    if (requisition.status && !["LN", "CR", "GC", "UA", "RJ", "SA", "GA", "EX"].includes(requisition.status)) {
      // still proceed if accounts present
    }

    if (!requisition.accounts?.length && requisition.status !== "LN") {
      // Give a moment — sometimes accounts populate at LN only
      if (requisition.status === "EX") {
        return errorRedirect(origin, "connect_failed", "Bank authorisation expired. Please try again.");
      }
      if (requisition.status === "RJ") {
        return errorRedirect(origin, "access_denied", "The bank rejected the connection.");
      }
    }

    const existing = await prisma.bankConnection.findFirst({
      where: {
        userId,
        provider: "gocardless",
        institutionId: institutionId || requisition.institution_id || undefined,
        status: "active",
      },
    });

    let connId: string;
    if (existing) {
      const updated = await prisma.bankConnection.update({
        where: { id: existing.id },
        data: {
          accessTokenEnc: encryptSecret(requisitionId),
          institutionId: institutionId || requisition.institution_id || existing.institutionId,
          institutionName,
          status: "active",
        },
      });
      connId = updated.id;
    } else {
      const created = await prisma.bankConnection.create({
        data: {
          userId,
          provider: "gocardless",
          accessTokenEnc: encryptSecret(requisitionId),
          institutionId: institutionId || requisition.institution_id || null,
          institutionName,
          status: "active",
        },
      });
      connId = created.id;
    }

    await syncBankConnection(connId, userId);

    cookieStore.delete("gc_requisition_id");
    cookieStore.delete("gc_oauth_user");
    cookieStore.delete("gc_reference");
    cookieStore.delete("gc_institution_name");
    cookieStore.delete("gc_institution_id");

    return NextResponse.redirect(`${origin}/dashboard?connected=1`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "sync_failed";
    return errorRedirect(
      origin,
      "connect_failed",
      msg.includes("GoCardless")
        ? msg
        : "Could not finish linking your bank. Check secrets and redirect URI, then try again."
    );
  }
}
