// app/api/leads/route.ts
import { NextResponse } from "next/server";
import { fetchFUBLeads } from "@/utils/fub";

export async function GET() {
  try {
    const people = await fetchFUBLeads();
    // Shape mirrors your table’s needs
    return NextResponse.json({ people }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Failed to import leads" },
      { status: 500 }
    );
  }
}
