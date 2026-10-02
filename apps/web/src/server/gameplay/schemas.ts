import { z } from "zod";
import { isSupportedWager } from "./constants";
import { baccaratBetTypes } from "./baccarat";
import { diceBetTypes } from "./dice";
import { rouletteBetTypes } from "./roulette";

export const wagerSchema = z.object({
  wager: z.number().int().refine(isSupportedWager, "Choose one of the permitted wagers."),
}).strict();

export const rouletteSpinSchema = z.object({
  wager: z.number().int().refine(isSupportedWager, "Choose one of the permitted wagers."),
  bet: z.object({
    type: z.enum(rouletteBetTypes),
    number: z.number().int().min(0).max(36).optional(),
  }).strict(),
}).strict().superRefine((value, context) => {
  if (value.bet.type === "SINGLE_NUMBER" && value.bet.number === undefined) context.addIssue({ code: "custom", path: ["bet", "number"], message: "Select a number from 0 through 36." });
  if (value.bet.type !== "SINGLE_NUMBER" && value.bet.number !== undefined) context.addIssue({ code: "custom", path: ["bet", "number"], message: "This bet does not accept a number." });
});

export const sessionQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export const baccaratDealSchema = z.object({
  wager: z.number().int().refine(isSupportedWager, "Choose one of the permitted wagers."),
  bet: z.enum(baccaratBetTypes),
}).strict();

export const diceRollSchema = z.object({
  wager: z.number().int().refine(isSupportedWager, "Choose one of the permitted wagers."),
  bet: z.enum(diceBetTypes),
}).strict();
