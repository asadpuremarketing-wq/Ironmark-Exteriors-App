/**
 * Daily weather forecast + a "can we work outside" verdict for exterior
 * jobs (gutter cleaning/repair, siding, roofing, pressure washing, etc.).
 * Uses Open-Meteo (https://open-meteo.com) — free, no API key, no signup,
 * so this works out of the box with nothing for you to configure.
 *
 * Forecast is centered on Hamilton, ON (the business's home base). Every
 * service area (Burlington, Stoney Creek, Ancaster, Dundas, Grimsby,
 * St. Catharines, Niagara Falls, Brantford) is close enough in the Golden
 * Horseshoe that day-to-day outdoor-work conditions track together — this
 * is one regional forecast, not a per-city one.
 */

const LATITUDE = 43.2557;
const LONGITUDE = -79.8711;
const TIMEZONE = "America/Toronto";

export type WorkVerdict = "GOOD" | "CAUTION" | "BAD";

export type DayForecast = {
  date: string; // YYYY-MM-DD
  tempMaxC: number;
  tempMinC: number;
  precipitationProbability: number; // 0-100
  precipitationMm: number;
  windSpeedMaxKmh: number;
  windGustMaxKmh: number;
  weatherCode: number;
  conditionLabel: string;
  verdict: WorkVerdict;
  reasons: string[]; // why it's CAUTION/BAD, empty when GOOD
};

// WMO weather codes (what Open-Meteo returns) -> short human label.
const WEATHER_CODE_LABELS: Record<number, string> = {
  0: "Clear",
  1: "Mostly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Freezing fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Heavy drizzle",
  56: "Freezing drizzle",
  57: "Freezing drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  66: "Freezing rain",
  67: "Freezing rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Light showers",
  81: "Showers",
  82: "Heavy showers",
  85: "Snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm w/ hail",
  99: "Thunderstorm w/ hail",
};

const SEVERE_CODES = new Set([56, 57, 65, 66, 67, 75, 82, 86, 95, 96, 99]);
const WET_CODES = new Set([51, 53, 55, 61, 63, 80, 81, 71, 73, 77, 85]);

function conditionLabel(code: number): string {
  return WEATHER_CODE_LABELS[code] ?? "Unknown";
}

/**
 * Outdoor-work safety thresholds for a crew on ladders/roofs doing gutter
 * cleaning, gutter/downspout repair, siding, roofing, or pressure washing.
 * Not a weather-API guess — these are the actual hazards: wind destabilizes
 * ladders and makes roof work dangerous, rain makes surfaces slick, freezing
 * temps ice up gutters and ladder rungs.
 */
function assessDay(day: {
  tempMaxC: number;
  tempMinC: number;
  precipitationProbability: number;
  precipitationMm: number;
  windSpeedMaxKmh: number;
  windGustMaxKmh: number;
  weatherCode: number;
}): { verdict: WorkVerdict; reasons: string[] } {
  const reasons: string[] = [];
  let verdict: WorkVerdict = "GOOD";

  function escalate(to: WorkVerdict, reason: string) {
    reasons.push(reason);
    if (to === "BAD" || verdict === "GOOD") verdict = to;
  }

  // Severe codes (thunderstorm, freezing rain, heavy snow/showers) are
  // dangerous whenever present, regardless of probability. A merely "wet"
  // code (light rain/drizzle/snow) only matters if it's actually likely —
  // Open-Meteo's daily weathercode is the day's single most-significant
  // condition, so it can show "drizzle" even on a day with a 19% chance.
  if (SEVERE_CODES.has(day.weatherCode)) {
    escalate("BAD", `${conditionLabel(day.weatherCode)} expected`);
  } else if (day.precipitationProbability >= 70) {
    escalate(
      "BAD",
      `High chance of ${(WET_CODES.has(day.weatherCode) ? conditionLabel(day.weatherCode) : "precipitation").toLowerCase()} (${day.precipitationProbability}%)`
    );
  } else if (day.precipitationProbability >= 40) {
    escalate("CAUTION", `Chance of precipitation (${day.precipitationProbability}%)`);
  }

  if (day.windGustMaxKmh >= 50) {
    escalate("BAD", `Dangerous wind gusts up to ${Math.round(day.windGustMaxKmh)} km/h`);
  } else if (day.windSpeedMaxKmh >= 35 || day.windGustMaxKmh >= 40) {
    escalate("CAUTION", `Strong wind, up to ${Math.round(Math.max(day.windSpeedMaxKmh, day.windGustMaxKmh))} km/h`);
  }

  if (day.tempMinC <= -5) {
    escalate("BAD", `Very cold, risk of ice (low ${Math.round(day.tempMinC)}°C)`);
  } else if (day.tempMinC <= 0) {
    escalate("CAUTION", `Near/below freezing overnight, watch for ice (low ${Math.round(day.tempMinC)}°C)`);
  }

  if (day.tempMaxC >= 33) {
    escalate("CAUTION", `Extreme heat (high ${Math.round(day.tempMaxC)}°C) — plan breaks/hydration`);
  }

  return { verdict, reasons };
}

type OpenMeteoResponse = {
  daily?: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
    precipitation_sum: number[];
    windspeed_10m_max: number[];
    windgusts_10m_max: number[];
    weathercode: number[];
  };
};

/**
 * Fetches the daily forecast for the next `days` days (Open-Meteo supports
 * up to 16). Revalidated every 30 minutes by Next.js's fetch cache — no
 * need to hit the API on every single page load.
 */
export async function getDailyForecast(days: number = 16): Promise<DayForecast[]> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(LATITUDE));
  url.searchParams.set("longitude", String(LONGITUDE));
  url.searchParams.set(
    "daily",
    [
      "temperature_2m_max",
      "temperature_2m_min",
      "precipitation_probability_max",
      "precipitation_sum",
      "windspeed_10m_max",
      "windgusts_10m_max",
      "weathercode",
    ].join(",")
  );
  url.searchParams.set("timezone", TIMEZONE);
  url.searchParams.set("forecast_days", String(Math.min(Math.max(days, 1), 16)));
  url.searchParams.set("wind_speed_unit", "kmh");

  const res = await fetch(url.toString(), { next: { revalidate: 1800 } });
  if (!res.ok) {
    throw new Error(`Weather API request failed (${res.status})`);
  }
  const data = (await res.json()) as OpenMeteoResponse;
  if (!data.daily) return [];

  const { time, temperature_2m_max, temperature_2m_min, precipitation_probability_max, precipitation_sum, windspeed_10m_max, windgusts_10m_max, weathercode } =
    data.daily;

  return time.map((date, i) => {
    const base = {
      tempMaxC: temperature_2m_max[i],
      tempMinC: temperature_2m_min[i],
      precipitationProbability: precipitation_probability_max[i],
      precipitationMm: precipitation_sum[i],
      windSpeedMaxKmh: windspeed_10m_max[i],
      windGustMaxKmh: windgusts_10m_max[i],
      weatherCode: weathercode[i],
    };
    const { verdict, reasons } = assessDay(base);
    return {
      date,
      ...base,
      conditionLabel: conditionLabel(base.weatherCode),
      verdict,
      reasons,
    };
  });
}

/** Builds a date -> DayForecast lookup for quick rendering against a calendar grid. */
export function forecastByDate(forecast: DayForecast[]): Map<string, DayForecast> {
  return new Map(forecast.map((f) => [f.date, f]));
}
