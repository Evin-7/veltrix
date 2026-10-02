import { expect, test, type Page } from "@playwright/test";

type MockAdminApiOptions = {
  providers?: Array<{
    id: string;
    name: string;
    slug: string;
    status: "ACTIVE" | "INACTIVE";
    _count: { games: number };
  }>;
};

async function mockAdminApi(
  page: Page,
  {
    providers = [
      {
        id: "provider-1",
        name: "Astra Works",
        slug: "astra-works",
        status: "ACTIVE",
        _count: { games: 0 },
      },
    ],
  }: MockAdminApiOptions = {},
) {
  let saveMode: "server-error" | "network-error" = "server-error";

  await page.route("**/api/v1/admin/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const origin = request.headers().origin ?? "http://localhost:3001";
    const corsHeaders = {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Headers": "content-type",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
      Vary: "Origin",
    };

    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: corsHeaders });
      return;
    }

    if (url.pathname.endsWith("/api/v1/admin/auth/me")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: corsHeaders,
        body: JSON.stringify({
          data: {
            id: "admin-1",
            email: "admin@veltrix.local",
            role: "SUPER_ADMIN",
            status: "ACTIVE",
            profile: null,
          },
        }),
      });
      return;
    }

    if (
      url.pathname.endsWith("/api/v1/admin/games") &&
      request.method() === "GET"
    ) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: corsHeaders,
        body: JSON.stringify({ data: { games: [], providers } }),
      });
      return;
    }

    if (
      url.pathname.endsWith("/api/v1/admin/games") &&
      request.method() === "POST"
    ) {
      if (saveMode === "network-error") {
        await route.abort("failed");
      } else {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          headers: corsHeaders,
          body: JSON.stringify({
            error: { code: "TEST_FAILURE", message: "Catalog save failed." },
          }),
        });
      }
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: corsHeaders,
      body: JSON.stringify({ data: {} }),
    });
  });

  await page.goto("http://localhost:3001/admin/games");
  await expect(
    page.getByRole("heading", { name: "Games & providers" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add game" }).click();
  await expect(
    page.getByRole("heading", { name: "New catalog game" }),
  ).toBeVisible();

  return {
    setSaveMode(mode: "server-error" | "network-error") {
      saveMode = mode;
    },
  };
}

async function chooseGameOption(page: Page, field: string, option: string) {
  await page.getByRole("combobox", { name: field }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

async function fillValidGameFields(
  page: Page,
  {
    provider = true,
    category = true,
  }: { provider?: boolean; category?: boolean } = {},
) {
  await page.getByLabel("Game name").fill("Neon Relics");
  await page.getByLabel("Game slug").fill("neon-relics");
  await page.getByLabel("Demo RTP").fill("96.5");
  await page.getByLabel("Description").fill("A polished arcade game.");
  if (provider) await chooseGameOption(page, "Game provider", "Astra Works");
  if (category) await chooseGameOption(page, "Game category", "SLOTS");
}

test.describe("admin form error feedback", () => {
  test("uses one deduplicated toast, field state, and focus for invalid game values", async ({
    page,
  }) => {
    await mockAdminApi(page);
    const submit = page.getByRole("button", { name: "Create inactive game" });
    const errors = page.locator(".admin-toast--error");

    await submit.click();
    await expect(errors).toHaveCount(1);
    await expect(errors).toContainText("Please check the highlighted fields.");
    await expect(page.getByLabel("Game name")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await expect(page.getByLabel("Game slug")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await expect(
      page.getByRole("combobox", { name: "Game provider" }),
    ).toHaveAttribute("aria-invalid", "true");
    await expect(
      page.getByRole("combobox", { name: "Game category" }),
    ).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator(".admin-field-error")).toHaveCount(0);
    await expect(page.getByLabel("Game name")).toBeFocused();

    await submit.click();
    await expect(errors).toHaveCount(1);

    await fillValidGameFields(page);
    await page.getByLabel("Game slug").fill("bad_slug");
    await submit.click();
    await expect(errors.last()).toContainText("Invalid game slug");
    await expect(errors.last()).toContainText(
      "Use lowercase letters, numbers, and hyphens.",
    );
    await expect(page.getByLabel("Game slug")).toHaveAttribute(
      "aria-invalid",
      "true",
    );

    await page.getByLabel("Game slug").fill("neon-relics");
    await expect(page.getByLabel("Game slug")).not.toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await page.getByLabel("Demo RTP").fill("101");
    await submit.click();
    await expect(errors.last()).toContainText("Invalid RTP");
    await expect(page.getByLabel("Demo RTP")).toHaveAttribute(
      "aria-invalid",
      "true",
    );

    await page.getByLabel("Demo RTP").fill("96.5");
    await page.getByLabel("Game name").fill("");
    await submit.click();
    await expect(errors.last()).toContainText("Game name is required");

    await page.getByLabel("Game name").fill("Neon Relics");
    await page.getByLabel("Description").fill("");
    await submit.click();
    await expect(errors.last()).toContainText("Description is required");
    await expect(page.locator(".admin-field-error")).toHaveCount(0);
  });

  test("reports a missing provider through the toast and combobox state", async ({
    page,
  }) => {
    await mockAdminApi(page);
    await fillValidGameFields(page, { provider: false });
    const submit = page.getByRole("button", { name: "Create inactive game" });
    await submit.click();

    await expect(page.locator(".admin-toast--error").last()).toContainText(
      "Select a provider.",
    );
    await expect(
      page.getByRole("combobox", { name: "Game provider" }),
    ).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator(".admin-field-error")).toHaveCount(0);
  });

  test("requires an explicit game category", async ({ page }) => {
    await mockAdminApi(page);
    await fillValidGameFields(page, { category: false });
    await page.getByRole("button", { name: "Create inactive game" }).click();

    await expect(page.locator(".admin-toast--error")).toContainText(
      "Select a category.",
    );
    await expect(page.locator(".admin-toast--error")).toContainText(
      "Invalid category",
    );
    await expect(
      page.getByRole("combobox", { name: "Game category" }),
    ).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator(".admin-field-error")).toHaveCount(0);
  });

  test("rejects unsupported and oversized thumbnails without inline error text", async ({
    page,
  }) => {
    await mockAdminApi(page);
    await fillValidGameFields(page);
    const fileInput = page.locator('input[name="thumbnailFile"]');
    const submit = page.getByRole("button", { name: "Create inactive game" });
    const errors = page.locator(".admin-toast--error");

    await fileInput.setInputFiles({
      name: "thumbnail.gif",
      mimeType: "image/gif",
      buffer: Buffer.from("GIF89a"),
    });
    await expect(errors).toContainText("Choose a JPG, PNG, or WebP image.");
    await expect(
      page.locator('.admin-upload-dropzone[data-invalid="true"]'),
    ).toBeVisible();
    await expect(page.locator(".admin-field-error")).toHaveCount(0);

    await submit.click();
    await expect(errors).toHaveCount(1);

    await fileInput.setInputFiles({
      name: "too-large.png",
      mimeType: "image/png",
      buffer: Buffer.alloc(8 * 1024 * 1024 + 1),
    });
    await expect(errors.last()).toContainText("Choose an image under 8 MB.");
    await expect(page.locator(".admin-field-error")).toHaveCount(0);
  });

  test("shows API and network failures through the shared toast", async ({
    page,
  }) => {
    const api = await mockAdminApi(page);
    await fillValidGameFields(page);
    const submit = page.getByRole("button", { name: "Create inactive game" });
    const errors = page.locator(".admin-toast--error");

    await submit.click();
    await expect(errors).toContainText("Catalog save failed.");

    api.setSaveMode("network-error");
    await expect(submit).toBeEnabled();
    await submit.click();
    await expect(errors.last()).toContainText(
      "The admin service could not be reached. Please try again.",
    );
    await expect(page.locator(".admin-field-error")).toHaveCount(0);
  });
});
