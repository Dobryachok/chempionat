/**
 * Visual smoke check of the frontend: walks the main user path in a real browser
 * (system Edge via Playwright core) and writes screenshots plus console errors.
 * Usage: node scripts/ui-check.mjs
 */
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const OUT = 'D:\\chempionat\\screenshots'
mkdirSync(OUT, { recursive: true })

const errors = []
const shot = async (page, name) => {
  await page.screenshot({ path: `${OUT}\\${name}.png`, fullPage: false })
  console.log(`  screenshot: ${name}.png`)
}

const browser = await chromium.launch({ executablePath: EDGE, headless: true })

const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
const page = await desktop.newPage()
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`[console] ${message.text()}`)
})
page.on('pageerror', (error) => errors.push(`[pageerror] ${error.message}`))

console.log('1. Главный экран')
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' })
await page.waitForTimeout(900)
await shot(page, '01-home-desktop')

console.log('2. Экран выбора ставки')
await page.getByText('Зелёный шар', { exact: false }).first().click()
await page.waitForTimeout(900)
await shot(page, '02-bet-green')

console.log('3. Турнирная таблица')
await page.getByRole('button', { name: /Турнир/ }).first().click()
await page.waitForTimeout(700)
await shot(page, '03-tournament-sheet')
await page.keyboard.press('Escape')

console.log('4. Правила')
await page.getByRole('button', { name: /Правила/ }).first().click()
await page.waitForTimeout(500)
await shot(page, '04-rules')
await page.keyboard.press('Escape')
await page.waitForTimeout(300)

console.log('5. Полёт и cashout')
await page.locator('.bet-option').nth(1).click()
await page.waitForTimeout(200)
await page.getByRole('button', { name: 'Начать игру' }).click()
await page.waitForTimeout(1500)
await shot(page, '05-game-flight')

const cashoutButton = page.locator('.game__footer button')
let cashedOut = false
for (let attempt = 0; attempt < 40; attempt += 1) {
  if (await page.locator('.game__crash-note').count()) break
  if (await cashoutButton.isEnabled()) {
    await cashoutButton.click()
    cashedOut = true
    break
  }
  await page.waitForTimeout(250)
}
await page.waitForTimeout(500)
await shot(page, cashedOut ? '06-cashout' : '06-no-cashout')
console.log(cashedOut ? '  cashout выполнен' : '  шар лопнул до первого уровня')

console.log('6. Экран результата')
await page.waitForURL('**/result', { timeout: 40_000 })
await page.waitForTimeout(1200)
await shot(page, '07-result')

const upsell = page.locator('.upsell')
if (await upsell.count()) {
  console.log('  показано окно «Закрепи успех»')
  await shot(page, '08-upsell')
  await page.getByRole('button', { name: 'Купить' }).click()
  await page.waitForTimeout(800)
  await shot(page, '09-result-after-upsell')
}

console.log('7. Проигрыш без cashout')
await page.getByRole('button', { name: 'Играть снова' }).click()
await page.waitForTimeout(600)
await page.locator('.bet-option').first().click()
await page.getByRole('button', { name: 'Начать игру' }).click()
await page.waitForURL('**/result', { timeout: 60_000 })
await page.waitForTimeout(1000)
await shot(page, '10-result-loss')

console.log('8. Профиль и админ-панель')
await page.goto('http://localhost:5173/profile', { waitUntil: 'networkidle' })
await page.waitForTimeout(600)
await shot(page, '11-profile')
await page.goto('http://localhost:5173/admin', { waitUntil: 'networkidle' })
await page.waitForTimeout(900)
await shot(page, '12-admin')

console.log('9. Мобильная вёрстка 390x844')
const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
const mobilePage = await mobile.newPage()
mobilePage.on('pageerror', (error) => errors.push(`[mobile pageerror] ${error.message}`))
await mobilePage.goto('http://localhost:5173/', { waitUntil: 'networkidle' })
await mobilePage.waitForTimeout(800)
await shot(mobilePage, '13-home-mobile')
await mobilePage.getByText('Красный шар', { exact: false }).first().click()
await mobilePage.waitForTimeout(900)
await shot(mobilePage, '14-bet-mobile')
await mobilePage.locator('.bet-option').nth(2).click()
await mobilePage.getByRole('button', { name: 'Начать игру' }).click()
await mobilePage.waitForTimeout(2200)
await shot(mobilePage, '15-game-mobile')

console.log('10. Узкий экран 320px')
const narrow = await browser.newContext({ viewport: { width: 320, height: 720 } })
const narrowPage = await narrow.newPage()
await narrowPage.goto('http://localhost:5173/bet', { waitUntil: 'networkidle' })
await narrowPage.waitForTimeout(800)
await shot(narrowPage, '16-bet-320')

const overflow = await narrowPage.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
console.log(`  горизонтальное переполнение на 320px: ${overflow}px`)

await browser.close()

console.log('\nОшибки консоли:')
console.log(errors.length === 0 ? '  нет' : errors.map((error) => '  ' + error).join('\n'))
