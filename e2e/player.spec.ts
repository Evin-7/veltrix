import { expect, test } from "@playwright/test";

test.describe("player journey", () => {
  test.skip(
    process.env.E2E_RUN !== "1",
    "Set E2E_RUN=1 to run against the configured disposable Neon branch.",
  );

  test("registers, plays, uses the wallet, and signs in again", async ({
    page,
  }) => {
    test.setTimeout(420_000);
    const browserErrors: string[] = [];
    const apiFailures: string[] = [];
    page.on("pageerror", (error) => browserErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") {
        const location = message.location().url;
        browserErrors.push(
          `${message.text()}${location ? ` @ ${location}` : ""}`,
        );
      }
    });
    page.on("response", (response) => {
      if (response.status() >= 400) {
        const failure = `${response.status()} ${response.request().method()} ${response.url()}`;
        if (response.url().includes("/api/v1/")) apiFailures.push(failure);
        else browserErrors.push(failure);
      }
    });
    page.on("requestfailed", (request) => {
      const failure = request.failure()?.errorText;
      if (
        request.url().includes("/api/v1/") &&
        !request.url().endsWith("/realtime") &&
        failure !== "net::ERR_ABORTED"
      ) {
        apiFailures.push(`failed ${request.method()} ${request.url()}`);
      }
    });
    const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const email = `e2e-player-${suffix}@veltrix.local`;
    const username = `e2e_${suffix.slice(-16)}`;
    const password =
      process.env.E2E_PLAYER_PASSWORD ?? "E2E-only-password-2026!";

    await page.goto("/register");
    await page.getByLabel("Username").fill(username);
    await page.getByLabel("Email").fill(email);
    await page.locator("#password").fill(password);
    await page.locator("#confirm-password").fill(password);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/localhost:3000\/$/, { timeout: 30_000 });

    await page.goto("/casino");
    await expect(
      page.getByRole("heading", { name: "Find your next ritual." }),
    ).toBeVisible();

    const themeButton = page.getByRole("button", { name: /^Theme:/ });
    await themeButton.click();
    await page.getByRole("menuitemradio", { name: "Dark" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

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

    const gameplayResponse = (slug: string, endpoint: string) =>
      page
        .waitForResponse(
          (response) =>
            response.request().method() === "POST" &&
            response.url().includes(`/api/v1/games/${slug}/`) &&
            response.url().endsWith(endpoint),
          { timeout: 30_000 },
        )
        .then(async (response) => {
          expect(response.ok(), `${response.status()} ${response.url()}`).toBe(
            true,
          );
          const payload = (await response.json()) as { data?: unknown };
          expect(payload.data).toBeDefined();
          return payload.data as Record<string, unknown>;
        });

    for (const game of games) {
      await page.goto(`/casino/${game.slug}`);
      await page.getByRole("button", { name: "Play" }).click();
      await expect(page).toHaveURL(new RegExp(`/casino/${game.slug}/play$`));
      let settledNet = 0;
      if (game.action === "Deal hand") {
        const dealResponse = gameplayResponse(game.slug, "/deal");
        await page.getByRole("button", { name: game.action }).click();
        const dealData = await dealResponse;
        expect(["ACTIVE", "SETTLED"]).toContain(dealData.status);
        settledNet = dealData.netResult;
        const handInPlay = page.getByRole("button", { name: "Hand in play" });
        if (dealData.status === "ACTIVE") {
          const followUpName =
            game.slug === "veltrix-blackjack" ? "Double" : "Hit";
          const followUp = page.getByRole("button", { name: followUpName });
          await expect(followUp).toBeVisible({ timeout: 30_000 });
          await expect(followUp).toBeEnabled({ timeout: 30_000 });
          const followUpResponse = gameplayResponse(
            game.slug,
            `/${followUpName.toLowerCase()}`,
          );
          await followUp.click();
          const followUpData = await followUpResponse;
          expect(["ACTIVE", "SETTLED"]).toContain(followUpData.status);
          settledNet = followUpData.netResult;
          if (followUpData.status === "ACTIVE") {
            const standResponse = gameplayResponse(game.slug, "/stand");
            const stand = page.getByRole("button", { name: "Stand" });
            await expect(stand).toBeVisible({ timeout: 30_000 });
            await expect(stand).toBeEnabled({ timeout: 30_000 });
            await stand.click();
            const standData = await standResponse;
            expect(standData.status).toBe("SETTLED");
            settledNet = standData.netResult;
          }
        }
        await expect(handInPlay).toBeHidden({ timeout: 30_000 });
      } else {
        const endpoint = game.action === "Deal baccarat" ? "/deal" : "/spin";
        const response = gameplayResponse(game.slug, endpoint);
        await page.getByRole("button", { name: game.action }).click();
        const data = await response;
        expect(data.roundId).toBeTruthy();
        expect(data.newBalance).toEqual(expect.any(Number));
        settledNet = data.netResult;
      }

      if (settledNet > 0) {
        const celebration = page.getByRole("dialog", { name: "A moment to celebrate" });
        await expect(celebration).toBeVisible();
        await expect(celebration.getByText("Why you won")).toBeVisible();
        await expect(celebration.locator("li").first()).not.toBeEmpty();
        await celebration.getByRole("button", { name: "Continue playing" }).click();
        await expect(celebration).toBeHidden();
      }

      // Both exit paths must retire the loader from the original launch.
      if (game.slug === "lunar-circuit") {
        await page.getByRole("link", { name: "Back to game details" }).click();
        await expect(page).toHaveURL(new RegExp(`/casino/${game.slug}$`));
        await expect(page.getByRole("main", { name: "Loading page" })).toBeHidden();
        await expect(page.getByRole("button", { name: "Play", exact: true })).toBeEnabled();
        await page.getByRole("button", { name: "Play", exact: true }).click();
        await expect(page).toHaveURL(new RegExp(`/casino/${game.slug}/play$`));
        await page.goBack();
        await expect(page).toHaveURL(new RegExp(`/casino/${game.slug}$`));
        await expect(page.getByRole("main", { name: "Loading page" })).toBeHidden();
        await expect(page.getByRole("button", { name: "Play", exact: true })).toBeEnabled();
      }
    }

    await page.goto("/wallet");
    const lightThemeButton = page.getByRole("button", { name: /^Theme:/ });
    await lightThemeButton.click();
    await page.getByRole("menuitemradio", { name: "Light" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

    await expect(page.getByRole("heading", { name: /wallet/i })).toBeVisible();
    await page.goto("/promotions");
    await expect(
      page.getByRole("heading", { name: "Promotions" }),
    ).toBeVisible();
    await page.goto("/responsible-gaming");
    await expect(
      page.getByRole("heading", { name: "Responsible gaming" }),
    ).toBeVisible();

    const accountMenu = page.getByRole("button", { name: "Open account menu" });
    if (await accountMenu.isVisible()) {
      await accountMenu.click();
    } else {
      await page.getByRole("button", { name: "Open navigation menu" }).click();
    }
    await page.getByRole("button", { name: "Log out" }).click();
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.locator("#password").fill(password);
    const loginResponse = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        response.url().endsWith("/api/v1/auth/login"),
      { timeout: 30_000 },
    );
    await page.getByRole("button", { name: "Log in" }).click();
    const loginResult = await loginResponse;
    expect(
      loginResult.ok(),
      `${loginResult.status()} ${loginResult.url()}`,
    ).toBe(true);
    await expect(page).toHaveURL(/localhost:3000\/$/, { timeout: 30_000 });
    expect(
      browserErrors,
      `browser errors: ${browserErrors.join(" | ")}`,
    ).toEqual([]);
    expect(apiFailures, `API failures: ${apiFailures.join(" | ")}`).toEqual([]);
  });
});
