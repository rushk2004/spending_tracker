import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { requireUser } from "@/lib/session";
import {
  createEndUserAgreement,
  createRequisition,
  getRedirectUri,
  isGoCardlessConfigured,
} from "@/lib/gocardless";

const MISSING =
  "GoCardless Bank Account Data is not configured. Create user secrets at https://bankaccountdata.gocardless.com/ and set GOCARDLESS_SECRET_ID and GOCARDLESS_SECRET_KEY.";

export async function POST(req: Request) {
  const session = await requireUser();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isGoCardlessConfigured()) {
    return NextResponse.json(
      {
        configured: false,
        error: "not_configured",
        message: MISSING,
        redirectUri: getRedirectUri(),
        portalUrl: "https://bankaccountdata.gocardless.com/",
      },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const institutionId = body.institutionId as string | undefined;
  const institutionName = (body.institutionName as string | undefined) || null;

  if (!institutionId) {
    return NextResponse.json({ error: "institutionId is required" }, { status: 400 });
  }

  try {
    let agreementId: string | undefined;
    try {
      const agreement = await createEndUserAgreement(institutionId);
      agreementId = agreement.id;
    } catch {
      // Agreement is optional for some institutions
    }

    const reference = `sw-${session.userId.slice(0, 8)}-${crypto.randomBytes(8).toString("hex")}`;
    const requisition = await createRequisition({
      institutionId,
      reference,
      agreementId,
    });

    const cookieOpts = {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      maxAge: 600,
      path: "/",
    };

    cookies().set("gc_requisition_id", requisition.id, cookieOpts);
    cookies().set("gc_oauth_user", session.userId, cookieOpts);
    cookies().set("gc_reference", reference, cookieOpts);
    if (institutionName) {
      cookies().set("gc_institution_name", institutionName, cookieOpts);
    }
    cookies().set("gc_institution_id", institutionId, cookieOpts);

    return NextResponse.json({
      ok: true,
      url: requisition.link,
      requisitionId: requisition.id,
      redirectUri: getRedirectUri(),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not start bank connection" },
      { status: 500 }
    );
  }
}
