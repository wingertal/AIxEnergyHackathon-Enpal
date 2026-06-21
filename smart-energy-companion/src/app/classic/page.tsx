import {
  ensureData,
  getHouseholds,
  getHousehold,
  getTrafficStatus,
  getCheapestWindows,
  getMonthSummary,
  getMonthlyTrend,
  getEnergyOutlook,
  REFERENCE_NOW,
} from "@/lib/data";
import { POPULAR_QUESTIONS } from "@/lib/questions";
import { ClassicShell, type AppData } from "@/components/app/ClassicShell";
import { monthLabel } from "@/lib/format";

export default async function ClassicHome({
  searchParams,
}: {
  searchParams: Promise<{ hh?: string }>;
}) {
  const params = await searchParams;
  await ensureData();
  const households = getHouseholds();
  const id = households.some((h) => h.household_id === params.hh)
    ? params.hh!
    : households[0].household_id;
  await ensureData(id);
  const h = getHousehold(id);

  const hour = Number(REFERENCE_NOW.slice(11, 13));
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const data: AppData = {
    household: { id, name: h.name, city: h.city, pv_kwp: h.pv_kwp },
    households: households.map((x) => ({
      id: x.household_id,
      name: x.name,
      city: x.city,
    })),
    status: getTrafficStatus(id),
    windows: getCheapestWindows(id, undefined, 3),
    month: getMonthSummary(id),
    trend: getMonthlyTrend(id, 6),
    weather: getEnergyOutlook(id),
    questions: POPULAR_QUESTIONS,
    monthLabel: monthLabel(REFERENCE_NOW.slice(0, 7)),
    greeting,
  };

  return <ClassicShell data={data} />;
}
