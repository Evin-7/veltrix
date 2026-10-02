import { expect, test } from "@playwright/test";

test.describe("player journey", () => {
  test.skip(process.env.E2E_RUN !== "1", "Set E2E_RUN=1 to run against the configured disposable Neon branch.");

  test("registers, plays, uses the wallet, and signs in again", async ({ page }) => {
    const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const email = `e2e-player-${suffix}@veltrix.local`;
    const username = `e2e_${suffix.slice(-16)}`;
    const password = process.env.E2E_PLAYER_PASSWORD ?? "E2E-only-password-2026!";

    await page.goto("/register");
    await page.getByLabel("Username").fill(username);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Create demo account" }).click();
    await expect(page).toHaveURL(/localhost:3000\/$/);

    await page.goto("/casino");
    await expect(page.getByRole("heading", { name: "Find your next ritual." })).toBeVisible();
    await page.getByRole("link", { name: /Open Neon Relics/ }).click();
    await expect(page.getByRole("heading", { name: "Neon Relics" })).toBeVisible();
    await page.getByRole("button", { name: "Spin reels" }).click();
    await expect(page.getByText("Balance updated server-side.")).toBeVisible();

    await page.goto("/casino/veltrix-blackjack");
    await page.getByRole("button", { name: "Deal hand" }).click();
    await expect(page.getByText(/Balance updated server-side\./)).toBeVisible();

    await page.goto("/casino/european-roulette");
    await page.getByRole("button", { name: "Bet on 0" }).click();
    await page.getByRole("button", { name: "Spin wheel" }).click();
    await expect(page.getByText(/Balance updated server-side\./)).toBeVisible();

    await page.goto("/wallet");
    await expect(page.getByRole("heading", { name: /wallet/i })).toBeVisible();
    await page.goto("/promotions");
    await expect(page.getByRole("heading", { name: "Promotions" })).toBeVisible();
    await page.goto("/responsible-gaming");
    await expect(page.getByRole("heading", { name: "Responsible gaming" })).toBeVisible();

    await page.getByRole("button", { name: "Log out" }).first().click();
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL(/localhost:3000\/$/);
  });
});
