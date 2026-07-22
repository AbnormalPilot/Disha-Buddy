import { NextResponse } from "next/server";
import { q } from "@/lib/db";

// See app/api/stats/route.ts's comment — same static-prerender pitfall.
export const dynamic = "force-dynamic";

// Rough completeness score against the student_profile schema
// (HANDOVER.md §2.2) — used for the students table's completeness bar.
const PROFILE_FIELDS = [
  "preferred_name",
  "class_or_year",
  "board",
  "expected_or_actual_percent",
  "stream",
  "entrance_exams",
  "budget_per_year_inr",
  "home_state",
  "preferred_cities_or_stay_home",
  "language_comfort",
];

export async function GET() {
  const rows = await q<any>(
    `SELECT s.*,
            (SELECT COUNT(*)::int FROM events e WHERE e.student_id = s.id AND e.type = 'flag') AS flag_count
     FROM students s
     ORDER BY s.last_active DESC`,
  );

  const students = rows.map((row) => {
    const profile = JSON.parse(row.profile_json || "{}");
    const filled = PROFILE_FIELDS.filter((f) => profile[f] != null && profile[f] !== "").length;
    return {
      id: row.id,
      name: row.name,
      username: row.username,
      stream: profile.stream ?? null,
      classOrYear: profile.class_or_year ?? null,
      completeness: filled / PROFILE_FIELDS.length,
      lastActive: row.last_active,
      firstSeen: row.first_seen,
      status: row.status,
      flagged: row.flag_count > 0,
    };
  });

  return NextResponse.json({ students });
}
