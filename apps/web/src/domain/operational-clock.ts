export const OPERATIONAL_TIME_ZONE = "America/Sao_Paulo";
export const POWER_BI_TIMEZONE_OFFSET_MINUTES = 180;

export interface CalendarDayMinutesInput {
  selectedDate: string;
  now?: Date;
  timeZone?: string;
}

export interface NetAvailableMinutesInput {
  calendarMinutes: number;
  programmedStopMinutes?: number;
  timezoneOffsetMinutes?: number;
}

function dateTimeParts(date: Date, timeZone: string): Record<string, number> {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  return Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );
}

/** Reproduz Calendar[Dia_Min] no fuso operacional da planta. */
export function calculateCalendarDayMinutes({
  selectedDate,
  now = new Date(),
  timeZone = OPERATIONAL_TIME_ZONE,
}: CalendarDayMinutesInput): number {
  const { year, month, day, hour, minute } = dateTimeParts(now, timeZone);
  const currentDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  return selectedDate === currentDate ? hour * 60 + minute : 1_440;
}

/** Reproduz T-D-L-* = Calendar[Dia_Min] - P-P-* - F-H. */
export function calculateNetAvailableMinutes({
  calendarMinutes,
  programmedStopMinutes,
  timezoneOffsetMinutes = POWER_BI_TIMEZONE_OFFSET_MINUTES,
}: NetAvailableMinutesInput): number | undefined {
  if (
    !Number.isFinite(calendarMinutes)
    || !Number.isFinite(programmedStopMinutes)
    || !Number.isFinite(timezoneOffsetMinutes)
  ) return undefined;

  return calendarMinutes - Number(programmedStopMinutes) - timezoneOffsetMinutes;
}
