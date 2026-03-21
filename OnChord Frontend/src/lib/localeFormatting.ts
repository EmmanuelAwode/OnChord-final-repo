type DateFormatSetting = "mdy" | "dmy" | "ymd";
type TimeFormatSetting = "12h" | "24h";

export interface AppLocaleSettings {
  language: string;
  region: string;
  dateFormat: DateFormatSetting;
  timeFormat: TimeFormatSetting;
  timezone: string;
  locale: string;
  resolvedTimezone: string;
}

function loadSetting<T>(key: string, defaultValue: T): T {
  try {
    const saved = localStorage.getItem(`onchord_settings_${key}`);
    return saved ? (JSON.parse(saved) as T) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function normalizeTimezone(timezone: string): string {
  const legacyToIana: Record<string, string> = {
    utc: "UTC",
    est: "America/New_York",
    pst: "America/Los_Angeles",
    cet: "Europe/Paris",
    jst: "Asia/Tokyo",
  };

  return legacyToIana[timezone] || timezone;
}

export function getAppLocaleSettings(): AppLocaleSettings {
  const language = loadSetting("language", "en");
  const regionSetting = loadSetting("region", "auto");
  const dateFormat = loadSetting<DateFormatSetting>("dateFormat", "mdy");
  const timeFormat = loadSetting<TimeFormatSetting>("timeFormat", "12h");
  const timezoneSetting = loadSetting("timezone", "auto");

  const browserLocale = navigator.language || "en-US";
  const detectedRegion = browserLocale.split("-")[1] || "US";
  const region = regionSetting === "auto" ? detectedRegion : regionSetting;
  const locale = `${language}-${region}`;

  const resolvedTimezone =
    timezoneSetting === "auto"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : normalizeTimezone(timezoneSetting);

  return {
    language,
    region,
    dateFormat,
    timeFormat,
    timezone: timezoneSetting,
    locale,
    resolvedTimezone,
  };
}

export function formatDateForDisplay(
  dateInput: Date | string | number,
  style: "short" | "monthDay" | "full" = "short"
): string {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  const { locale, resolvedTimezone, dateFormat } = getAppLocaleSettings();

  let options: Intl.DateTimeFormatOptions;
  if (style === "monthDay") {
    options = { month: "short", day: "numeric", timeZone: resolvedTimezone };
  } else if (style === "full") {
    options = { month: "short", day: "numeric", year: "numeric", timeZone: resolvedTimezone };
  } else if (dateFormat === "dmy") {
    options = { day: "2-digit", month: "2-digit", year: "numeric", timeZone: resolvedTimezone };
  } else if (dateFormat === "ymd") {
    options = { year: "numeric", month: "2-digit", day: "2-digit", timeZone: resolvedTimezone };
  } else {
    options = { month: "2-digit", day: "2-digit", year: "numeric", timeZone: resolvedTimezone };
  }

  return new Intl.DateTimeFormat(locale, options).format(date);
}
