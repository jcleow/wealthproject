import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    // Wait for navigation to complete
    page.setDefaultTimeout(30000);
  });
  test('should load the landing page', async ({ page }) => {
    await page.goto('/');

    // Wait for the page to be loaded
    await expect(page).toHaveTitle(/Assetra|Financial/i);
  });

  test('should display hero content', async ({ page }) => {
    await page.goto('/');

    // Check that the landing page has loaded with content
    const heroSection = page.locator('.landing-content');
    await expect(heroSection).toBeVisible();
  });

  test('should navigate to login page', async ({ page }) => {
    await page.goto('/login');

    // Check for the login heading
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();

    // Check for sign up link
    await expect(page.getByRole('link', { name: /sign up/i })).toBeVisible();
  });

  test('should navigate to signup page', async ({ page }) => {
    await page.goto('/signup');

    // Check that the signup page loads
    await expect(page).toHaveURL(/signup/);
  });

  test('login page should have email and password fields', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' });

    // Check for form fields
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();

    // Check for submit button
    await expect(page.getByRole('button', { name: /sign in|log in/i })).toBeVisible();
  });
});
