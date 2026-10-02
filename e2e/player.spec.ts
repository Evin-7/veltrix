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

    const games = [
      { slug: "neon-relics", action: "Spin" },
      { slug: "veltrix-blackjack", action: "Deal hand" },
      { slug: "european-roulette", action: "Spin wheel" },
      { slug: "lunar-circuit", action: "Spin reels" },
      { slug: "velvet-roulette", action: "Spin wheel" },
      { slug: "signal-blackjack", action: "Deal hand" },
      { slug: "neon-paddock", action: "Start night run" },
      { slug: "orbit-reels", action: "Spin reels" },
      { slug: "gilded-dice", action: "Roll dice" },
      { slug: "tide-chase", action: "Start night run" },
      { slug: "ember-room", action: "Spin reels" },
      { slug: "afterglow-baccarat", action: "Deal baccarat" },
      { slug: "cinder-club", action: "Roll dice" },
      { slug: "prism-pulse", action: "Start night run" },
      { slug: "moonlit-mint", action: "Spin reels" },
    ];

    for (const game of games) {
      await page.goto(`/casino/${game.slug}`);
      await page.getByRole("button", { name: "Play Demo" }).click();
      await expect(page).toHaveURL(new RegExp(`/casino/${game.slug}/play$`));
      await page.getByRole("button", { name: game.action }).click();
      if (game.action === "Deal hand") {
        const stand = page.getByRole("button", { name: "Stand" });
        if (await stand.isVisible()) await stand.click();
      }
      if (game.action === "Deal hand") await expect(page.getByText(/PLAYER|DEALER|PUSH|BUST|BLACKJACK/).first()).toBeVisible();
      else if (game.action === "Start night run") await expect(page.getByText(/score|Returned|Run complete/).first()).toBeVisible({ timeout: 10_000 });
      else await expect(page.getByText(/Round complete|Round settled|Bet .* settled|No line win|No win/).first()).toBeVisible();
      await page.goto("/casino");
    }

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
