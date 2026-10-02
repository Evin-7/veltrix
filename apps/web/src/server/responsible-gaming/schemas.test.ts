import { describe, expect, it } from "vitest";
import { coolOffSchema, responsibleSettingsSchema } from "./schemas";

describe("responsible gaming schemas", () => {
  it("bounds player-configurable controls", () => {
    expect(
      responsibleSettingsSchema.parse({
        sessionReminderMinutes: 30,
        dailyWagerLimit: 250,
        maxWager: 100,
      }),
    ).toMatchObject({ dailyWagerLimit: 250, maxWager: 100 });
    expect(() =>
      responsibleSettingsSchema.parse({
        sessionReminderMinutes: 1,
        dailyWagerLimit: null,
        maxWager: null,
      }),
    ).toThrow();
    expect(() =>
      responsibleSettingsSchema.parse({
        sessionReminderMinutes: 30,
        dailyWagerLimit: 250,
        maxWager: 501,
      }),
    ).toThrow();
  });

  it("accepts only the configured cool-off durations", () => {
    expect(coolOffSchema.parse({ hours: 1 })).toEqual({ hours: 1 });
    expect(coolOffSchema.parse({ hours: 24 })).toEqual({ hours: 24 });
    expect(coolOffSchema.parse({ hours: 168 })).toEqual({ hours: 168 });
    expect(() => coolOffSchema.parse({ hours: 2 })).toThrow();
  });
});
