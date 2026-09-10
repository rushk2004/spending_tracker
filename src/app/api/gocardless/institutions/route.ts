import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { isGoCardlessConfigured, listInstitutions } from "@/lib/gocardless";

export async function GET(req: Request) {
  const session = await requireUser();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isGoCardlessConfigured()) {
    return NextResponse.json(
      {
        configured: false,
        error: "not_configured",
        message:
          "GoCardless Bank Account Data is not configured. Add GOCARDLESS_SECRET_ID and GOCARDLESS_SECRET_KEY.",
        institutions: [],
      },
      { status: 503 }
    );
  }

  const url = new URL(req.url);
  const country = (url.searchParams.get("country") || "gb").toLowerCase();
  const extra = url.searchParams.get("eu") === "1";

  try {
    const countries = extra
      ? [country, "ie", "de", "fr", "nl", "es", "it", "pt", "at", "be", "fi", "se", "no", "dk", "pl"]
      : [country];
    const uniqueCountries = Array.from(new Set(countries));
    const institutions = await listInstitutions(uniqueCountries);
    return NextResponse.json({
      configured: true,
      country,
      institutions: institutions.map((i) => ({
        id: i.id,
        name: i.name,
        logo: i.logo || null,
        bic: i.bic || null,
        countries: i.countries || [],
      })),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to list institutions" },
      { status: 500 }
    );
  }
}
