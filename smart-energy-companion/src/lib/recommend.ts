import "server-only";
import {
  getHousehold,
  getEnergyHealth,
  getMonthSummary,
  getMonthToDate,
  getBillComparison,
  getBatteryRecommendation,
  compareTariffs,
  getCheapestWindows,
  getEnergyOutlook,
  getInsights,
  getEquipment,
  getRecommendations,
  REFERENCE_NOW,
  type Recommendation,
} from "./data";

// The recommendation card only knows how to render these icons / tones.
const REC_ICONS = ["bolt", "ev", "heatpump", "battery", "tariff", "sun", "alert"] as const;
const REC_TONES = ["good", "warn", "info"] as const;

/**
 * The grounding payload handed to the AI agent, THIS household's real, computed
 * energy picture (profile + live state + savings + forecast + anomalies). The
 * agent must base every tip on these numbers, never invent figures.
 */
function buildProfile(id: string) {
  const h = getHousehold(id);
  return {
    now: REFERENCE_NOW,
    household: {
      name: h.name,
      city: h.city,
      residents: h.residents,
      pv_kwp: h.pv_kwp,
      battery_kwh: h.battery_kwh,
      heat_pump: h.heat_pump,
      ev_charger: h.ev_charger,
      tariff: h.tariff_id,
    },
    health: getEnergyHealth(id),
    month: getMonthSummary(id),
    monthToDate: getMonthToDate(id),
    billComparison: getBillComparison(id),
    batteryRecommendation: getBatteryRecommendation(id),
    tariffComparison: compareTariffs(id),
    cheapestWindows: getCheapestWindows(id, undefined, 3),
    weekOutlook: getEnergyOutlook(id),
    equipment: getEquipment(id).map((u) => ({
      key: u.key,
      name: u.name,
      condition: u.condition,
      status: u.status,
      today_eur: u.today_eur,
      month_eur: u.month_eur,
      impact: u.impact,
    })),
    anomalies: getInsights(id).filter((e) => e.type === "anomaly"),
  };
}

/**
 * Personalized recommendations from an OpenAI agent, grounded in the household's
 * computed metrics. Falls back to the deterministic engine when no
 * OPENAI_API_KEY is configured or the call fails, so the app always works.
 */
export async function getAIRecommendations(id: string): Promise<Recommendation[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  const fallback = getRecommendations(id);
  if (!apiKey) return fallback;

  try {
    const profile = buildProfile(id);
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey });
    const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

    const system =
      "You are a home-energy coach for a German household using the Enpal smart-energy app. " +
      "You receive a JSON snapshot of THIS household's real, computed energy data. Produce " +
      "specific, personalized, actionable recommendations grounded ONLY in the numbers provided. " +
      "Never invent figures. Speak in warm, plain language a non-expert understands. " +
      "Use commas or periods for punctuation; never use em dashes or en dashes. Return STRICT JSON.";

    const instructions =
      `Return a JSON object {"recommendations": [...]} with 4-7 items, each: ` +
      `{"id": string, "icon": one of ${JSON.stringify(REC_ICONS)}, ` +
      `"tone": one of ${JSON.stringify(REC_TONES)} (good=positive, warn=needs attention, info=neutral tip), ` +
      `"title": <=60 chars action-oriented, "detail": 1-2 sentences citing the household's real numbers, ` +
      `"saving": short money tag like "~€40/mo" or "free" (optional), "priority": integer 0-100 (higher shown first)}.\n` +
      `Tailor strictly to the household's assets (no EV → no EV tips; suggest a battery only if batteryRecommendation is present), ` +
      `tariff, ACTIVE anomalies (surface these as warn with high priority), the week outlook and the bill trend.`;

    const resp = await client.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: `${instructions}\n\nHOUSEHOLD DATA:\n${JSON.stringify(profile)}` },
      ],
    });

    const text = resp.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(text) as unknown;
    const list: unknown[] = Array.isArray(parsed)
      ? parsed
      : ((parsed as { recommendations?: unknown[] })?.recommendations ?? []);
    if (!Array.isArray(list) || list.length === 0) return fallback;

    const icons = REC_ICONS as readonly string[];
    const tones = REC_TONES as readonly string[];
    const clean: Recommendation[] = list
      .map((item, i): Recommendation => {
        const r = (item ?? {}) as Record<string, unknown>;
        return {
          id: String(r.id ?? `ai-${i}`),
          icon: (icons.includes(r.icon as string) ? r.icon : "bolt") as Recommendation["icon"],
          tone: (tones.includes(r.tone as string) ? r.tone : "info") as Recommendation["tone"],
          title: String(r.title ?? "").slice(0, 90),
          detail: String(r.detail ?? "").slice(0, 300),
          saving: r.saving ? String(r.saving).slice(0, 24) : undefined,
          priority: Number.isFinite(Number(r.priority)) ? Number(r.priority) : 50 - i,
        };
      })
      .filter((r) => r.title && r.detail);

    return clean.length ? clean.sort((a, b) => b.priority - a.priority) : fallback;
  } catch (err) {
    console.error("AI recommendations failed, using deterministic fallback:", err);
    return fallback;
  }
}
