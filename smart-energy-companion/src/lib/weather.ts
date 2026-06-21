// Types for the weekly energy outlook. The values are derived from the REAL
// dataset (the next 7 days of each household's timeseries) in data.ts, see
// getEnergyOutlook, not from a synthetic weather generator.
import type { TrafficLight } from "./data";

export type SkyIcon = "sun" | "partly" | "cloud" | "rain";

export interface DayForecast {
  date: string;
  weekday: string;
  temp_c: number;
  sun_hours: number; // full-sun-equivalent hours = daily PV kWh / system kWp
  solar_potential: "high" | "medium" | "low";
  icon: SkyIcon;
}

export interface WeatherOutlook {
  city: string;
  days: DayForecast[];
  avg_sun_hours: number;
  recommendation: {
    light: TrafficLight;
    title: string;
    detail: string;
  };
}
