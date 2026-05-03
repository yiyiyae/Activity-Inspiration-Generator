export type TimeOption = "Morning" | "Afternoon" | "Evening";
export type WeatherOption = "Sunny" | "Cloudy" | "Rainy";

export type RuntimeContext = {
  weather: WeatherOption;
  time: TimeOption;
  source: "live_weather" | "time_fallback";
  sourceText: string;
};

function detectTime(): TimeOption {
  const hour = new Date().getHours();
  if (hour < 12) return "Morning";
  if (hour < 18) return "Afternoon";
  return "Evening";
}

function weatherCodeToOption(code: number): WeatherOption {
  // Open-Meteo weathercode
  // 0 clear, 1-3 cloudy, 45/48 fog, 51+ rain/snow/thunder
  if (code === 0) return "Sunny";
  if (code >= 1 && code <= 48) return "Cloudy";
  return "Rainy";
}

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation unavailable"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      timeout: 5000,
      maximumAge: 10 * 60 * 1000,
      enableHighAccuracy: false,
    });
  });
}

async function getLiveWeatherByLocation(): Promise<WeatherOption> {
  const position = await getCurrentPosition();
  const { latitude, longitude } = position.coords;
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
    "&current=weather_code&timezone=auto";
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Weather API status ${response.status}`);
  }
  const data = (await response.json()) as { current?: { weather_code?: number } };
  const code = data.current?.weather_code;
  if (typeof code !== "number") {
    throw new Error("Missing weather code");
  }
  return weatherCodeToOption(code);
}

export async function getRuntimeContext(): Promise<RuntimeContext> {
  const time = detectTime();
  try {
    const weather = await getLiveWeatherByLocation();
    return {
      weather,
      time,
      source: "live_weather",
      sourceText: "实时天气 + 本地时间",
    };
  } catch {
    return {
      weather: "Cloudy",
      time,
      source: "time_fallback",
      sourceText: "天气回退（默认阴天）+ 本地时间",
    };
  }
}

export function toChineseTimeLabel(time: TimeOption): "上午" | "下午" | "晚上" {
  if (time === "Morning") return "上午";
  if (time === "Afternoon") return "下午";
  return "晚上";
}
