import { describe, expect, it } from "vitest";
import { responsibleSettingsSchema } from "./schemas";

describe("responsible gaming schemas", () => {
  it("bounds player-configurable controls", () => {
    expect(responsibleSettingsSchema.parse({ sessionReminderMinutes: 30, dailyWagerLimit: 250, maxWager: 100 })).toMatchObject({ dailyWagerLimit: 250, maxWager: 100 });
    expect(() => responsibleSettingsSchema.parse({ sessionReminderMinutes: 1, dailyWagerLimit: null, maxWager: null })).toThrow();
    expect(() => responsibleSettingsSchema.parse({ sessionReminderMinutes: 30, dailyWagerLimit: 250, maxWager: 501 })).toThrow();
  });
});
