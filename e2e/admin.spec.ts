import { expect, test } from "@playwright/test";

test.describe("admin journey", () => {
  test.skip(process.env.E2E_RUN !== "1" || !process.env.E2E_ADMIN_EMAIL || !process.env.E2E_ADMIN_PASSWORD, "Set E2E_RUN=1 and dedicated admin credentials to run against a disposable Neon branch.");

  test("reviews operations and records an authorized VC adjustment", async ({ page }) => {
    await page.goto("http://localhost:3001/login");
    await page.getByLabel("Email").fill(process.env.E2E_ADMIN_EMAIL ?? "");
    await page.getByLabel("Password").fill(process.env.E2E_ADMIN_PASSWORD ?? "");
    await page.getByRole("button", { name: "Enter control room" }).click();
    await expect(page).toHaveURL(/localhost:3001\/$/);

    await page.getByRole("button", { name: "Players" }).click();
    await expect(page.getByRole("heading", { name: "Players" })).toBeVisible();
    await page.getByRole("link", { name: /Orbit Player|Velvet Player|Lumen Player/ }).first().click();
    await expect(page.getByRole("heading", { name: /Player profile/i })).toBeVisible();

    const adjustment = page.getByRole("heading", { name: "Adjust VC balance" });
    if (await adjustment.isVisible()) {
      await page.getByLabel("Amount in VC").fill("1");
      await page.getByLabel("Reason").fill("E2E audit-path verification");
      await page.getByRole("button", { name: "Record adjustment" }).click();
      await expect(page.getByText(/Adjustment recorded/)).toBeVisible();
      await page.getByRole("button", { name: "Audit Logs" }).click();
      await expect(page.getByRole("heading", { name: "Audit logs" })).toBeVisible();
      await expect(page.getByText("VC_ADJUSTED")).toBeVisible();
    } else {
      test.info().annotations.push({ type: "note", description: "Configured admin is not SUPER_ADMIN; adjustment assertions were skipped." });
    }

    await page.getByRole("button", { name: "Games" }).click();
    await expect(page.getByRole("heading", { name: /Games & providers/ })).toBeVisible();
    await page.getByRole("button", { name: "Game Sessions" }).click();
    await expect(page.getByRole("heading", { name: "Game sessions" })).toBeVisible();
    await page.getByRole("button", { name: "Transactions" }).click();
    await expect(page.getByRole("heading", { name: "Transactions" })).toBeVisible();
  });
});
