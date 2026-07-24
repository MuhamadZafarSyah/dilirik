import { expect, test } from "@playwright/test"

/** E2E halaman publik (M4): landing, pricing, login, register, legal. */
test("landing menampilkan tagline dan CTA daftar", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByRole("heading", { level: 1 })).toContainText("dilirik")
  await expect(page.getByRole("link", { name: /daftar gratis/i }).first()).toBeVisible()
})

test("pricing menampilkan paket Free", async ({ page }) => {
  await page.goto("/pricing")
  await expect(page.getByText("Rp0")).toBeVisible()
  await expect(page.getByText(/10 analisis/i)).toBeVisible()
})

test("route privat redirect ke login bila belum auth", async ({ page }) => {
  await page.goto("/app")
  await expect(page).toHaveURL(/\/login/)
})

test("halaman login punya opsi Google & GitHub", async ({ page }) => {
  await page.goto("/login")
  await expect(page.getByRole("button", { name: /google/i })).toBeVisible()
  await expect(page.getByRole("button", { name: /github/i })).toBeVisible()
})
