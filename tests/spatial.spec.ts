import { test, expect } from "@playwright/test";

test("life-map mounts canvas", async ({ page }) => {
  await page.goto("/life-map");
  await expect(page.locator("canvas")).toBeVisible();
});

test("planetarium mounts canvas", async ({ page }) => {
  await page.goto("/dream-planetarium");
  await expect(page.locator("canvas")).toBeVisible();
});

test("ritual-ar fallback", async ({ page }) => {
  await page.goto("/ritual-ar");
  await expect(page.getByText(/AR not supported/i)).toBeVisible();
});
