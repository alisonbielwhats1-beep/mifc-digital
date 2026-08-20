import { describe, expect, it } from "vitest";
import {
  POWER_BI_TIMEZONE_OFFSET_MINUTES,
  calculateCalendarDayMinutes,
  calculateNetAvailableMinutes,
} from "./operational-clock.js";

describe("relógio operacional Calendar[Dia_Min]", () => {
  it("reproduz os minutos decorridos no dia atual no fuso de São Paulo", () => {
    expect(calculateCalendarDayMinutes({
      selectedDate: "2026-08-20",
      now: new Date("2026-08-20T16:38:00.000Z"),
    })).toBe(818);
  });

  it("usa 1.440 minutos para qualquer data diferente de hoje, como o DAX", () => {
    const now = new Date("2026-08-20T16:38:00.000Z");

    expect(calculateCalendarDayMinutes({ selectedDate: "2026-08-19", now })).toBe(1_440);
    expect(calculateCalendarDayMinutes({ selectedDate: "2026-08-21", now })).toBe(1_440);
  });

  it("resolve a virada de data pelo fuso operacional, não pelo UTC", () => {
    expect(calculateCalendarDayMinutes({
      selectedDate: "2026-08-20",
      now: new Date("2026-08-21T01:30:00.000Z"),
    })).toBe(1_350);
  });

  it("reproduz T-D-L subtraindo parada programada e F-H sem ocultar negativo", () => {
    expect(POWER_BI_TIMEZONE_OFFSET_MINUTES).toBe(180);
    expect(calculateNetAvailableMinutes({
      calendarMinutes: 818,
      programmedStopMinutes: 434.43333331961185,
    })).toBeCloseTo(203.56666668038815, 8);
    expect(calculateNetAvailableMinutes({
      calendarMinutes: 818,
      programmedStopMinutes: 766.65,
    })).toBeCloseTo(-128.65, 8);
  });

  it("falha fechado quando o cache de paradas não está disponível", () => {
    expect(calculateNetAvailableMinutes({
      calendarMinutes: 818,
      programmedStopMinutes: undefined,
    })).toBeUndefined();
  });
});
