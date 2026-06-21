import {
  ensureData,
  getHouseholds,
  getHousehold,
  getTrafficStatus,
  getCheapestWindows,
  getMonthSummary,
  getMonthlyTrend,
  getMonthToDate,
  getBillComparison,
  getDailySavings,
  getEquipment,
  getBatteryRecommendation,
  getEnergyOutlook,
  getSnapshot,
  getEnergyHealth,
  getSuggestedQuestions,
  compareTariffs,
  REFERENCE_NOW,
} from "@/lib/data";
import { getAIRecommendations } from "@/lib/recommend";
import { AppShell, type AppData } from "@/components/app/AppShell";
import { WebShell } from "@/components/app/WebShell";
import { monthLabel } from "@/lib/format";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ hh?: string }>;
}) {
  const params = await searchParams;
  // Load reference data from the enpal backend, pick the household, then load
  // that household's timeseries.
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
    household: {
      id,
      name: h.name,
      city: h.city,
      pv_kwp: h.pv_kwp,
      battery_kwh: h.battery_kwh,
      heat_pump: h.heat_pump,
      ev_charger: h.ev_charger,
    },
    households: households.map((x) => ({
      id: x.household_id,
      name: x.name,
      city: x.city,
    })),
    status: getTrafficStatus(id),
    health: getEnergyHealth(id),
    recommendations: await getAIRecommendations(id),
    windows: getCheapestWindows(id, undefined, 3),
    month: getMonthSummary(id),
    trend: getMonthlyTrend(id, 6),
    monthToDate: getMonthToDate(id),
    billComparison: getBillComparison(id),
    dailySavings: getDailySavings(id),
    equipment: getEquipment(id),
    live: getSnapshot(id),
    batteryRec: getBatteryRecommendation(id),
    tariff: compareTariffs(id),
    weather: getEnergyOutlook(id),
    questions: await getSuggestedQuestions(id),
    monthLabel: monthLabel(REFERENCE_NOW.slice(0, 7)),
    greeting,
  };

  return (
    <>
      {/* Phone view (< 768px) */}
      <div className="md:hidden">
        <AppShell data={data} />
      </div>
      {/* Tablet + desktop view (≥ 768px) */}
      <div className="hidden md:block">
        <WebShell data={data} />
      </div>
    </>
  );
}
