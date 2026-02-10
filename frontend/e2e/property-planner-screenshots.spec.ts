import { authenticatedTest } from './fixtures/auth'

authenticatedTest('property planner full flow screenshots', async ({ authenticatedPage: page }) => {
  authenticatedTest.setTimeout(90000)

  await page.setViewportSize({ width: 1440, height: 900 })

  // ─── 1. Overview page ──────────────────────────────────────────────────────
  await page.goto('/dashboard/cpf/property')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)

  await page.screenshot({
    path: 'e2e/screenshots/property-01-overview.png',
    fullPage: true,
  })
  console.log('1. Overview captured')

  // ─── 2. Open the modal via Edit button ─────────────────────────────────────
  const editBtn = page.getByRole('button', { name: /edit/i }).first()
  await editBtn.click()
  await page.waitForTimeout(2000)

  // ─── 3. Purchase tab - top of form ─────────────────────────────────────────
  await page.screenshot({
    path: 'e2e/screenshots/property-02-purchase-top.png',
    fullPage: true,
  })
  console.log('2. Purchase tab (top) captured')

  // ─── 4. Purchase tab - scroll form down ────────────────────────────────────
  // The form is inside a scrollable container within the dialog
  const dialog = page.locator('[role="dialog"]').first()
  await dialog.evaluate(el => {
    // Find all scrollable children and scroll the form panel (typically the left/center one)
    const scrollables = el.querySelectorAll('*')
    for (const child of scrollables) {
      if (child.scrollHeight > child.clientHeight + 50 && child.clientHeight > 200) {
        child.scrollTo(0, child.scrollHeight)
        break
      }
    }
  })
  await page.waitForTimeout(1000)

  await page.screenshot({
    path: 'e2e/screenshots/property-03-purchase-scrolled.png',
    fullPage: true,
  })
  console.log('3. Purchase tab (scrolled) captured')

  // ─── 5. Click Sale tab ─────────────────────────────────────────────────────
  const saleTab = page.getByText('Sale', { exact: true }).first()
  await saleTab.click()
  await page.waitForTimeout(1500)

  await page.screenshot({
    path: 'e2e/screenshots/property-04-sale-tab.png',
    fullPage: true,
  })
  console.log('4. Sale tab captured')

  // ─── 6. Click CPF tab ─────────────────────────────────────────────────────
  const cpfTab = page.getByText('CPF', { exact: true }).first()
  await cpfTab.click()
  await page.waitForTimeout(1500)

  await page.screenshot({
    path: 'e2e/screenshots/property-05-cpf-tab.png',
    fullPage: true,
  })
  console.log('5. CPF tab captured')

  // ─── 7. Click Borrowers step (step 2) ──────────────────────────────────────
  // Go back to Purchase tab first
  const purchaseTab = page.getByText('Purchase', { exact: true }).first()
  await purchaseTab.click()
  await page.waitForTimeout(1000)

  // Scroll form back to top
  await dialog.evaluate(el => {
    const scrollables = el.querySelectorAll('*')
    for (const child of scrollables) {
      if (child.scrollHeight > child.clientHeight + 50 && child.clientHeight > 200) {
        child.scrollTo(0, 0)
        break
      }
    }
  })
  await page.waitForTimeout(500)

  const borrowersStep = page.getByText('Borrowers', { exact: true }).first()
  await borrowersStep.click()
  await page.waitForTimeout(1500)

  await page.screenshot({
    path: 'e2e/screenshots/property-06-borrowers-step.png',
    fullPage: true,
  })
  console.log('6. Borrowers step captured')

  // ─── 8. Go back to Purchase tab and show Amortization ────────────────────
  await purchaseTab.click()
  await page.waitForTimeout(1000)

  const amortizationTab = page.getByText('Amortization', { exact: true }).first()
  const hasAmortization = await amortizationTab.isVisible().catch(() => false)
  if (hasAmortization) {
    await amortizationTab.click()
    await page.waitForTimeout(1500)

    await page.screenshot({
      path: 'e2e/screenshots/property-07-amortization.png',
      fullPage: true,
    })
    console.log('7. Amortization captured')
  }

  console.log('All property planner screenshots saved to e2e/screenshots/')
})
