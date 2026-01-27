import { chromium, Page } from 'playwright'
import { existsSync, mkdirSync, copyFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

const SCREENSHOTS_DIR = join(import.meta.dirname, '..', '..', 'screenshots')
const DEV_SERVER_URL = 'http://localhost:5173'

function updateCurrentState(): void {
  const currentStatePath = join(SCREENSHOTS_DIR, 'current-state.png')
  const files = readdirSync(SCREENSHOTS_DIR)
    .filter((f) => f.endsWith('.png') && f !== 'current-state.png')
    .map((f) => ({
      name: f,
      path: join(SCREENSHOTS_DIR, f),
      mtime: statSync(join(SCREENSHOTS_DIR, f)).mtime.getTime(),
    }))
    .sort((a, b) => b.mtime - a.mtime)

  if (files.length > 0) {
    copyFileSync(files[0].path, currentStatePath)
    console.log(`Current state updated from: ${files[0].name}`)
  }
}

// Smart interaction based on description keywords
async function prepareState(page: Page, description: string): Promise<void> {
  const desc = description.toLowerCase()

  // Close any open panels first by pressing Escape and clicking main area
  await page.keyboard.press('Escape')
  await page.waitForTimeout(100)
  const mainContent = page.locator('[data-testid="main-content"]')
  if (await mainContent.isVisible({ timeout: 500 }).catch(() => false)) {
    await mainContent.click({ position: { x: 10, y: 10 } })
    await page.waitForTimeout(100)
  }

  // Settings panel
  if (desc.includes('settings')) {
    const menuBtn = page.locator('button[aria-label="Menu"]')
    await menuBtn.click()
    await page.waitForTimeout(100)
    const settingsBtn = page.locator('button[aria-label="Settings"]')
    await settingsBtn.click()
    await page.waitForTimeout(300)
  }

  // Sessions panel
  if (desc.includes('session')) {
    const menuBtn = page.locator('button[aria-label="Menu"]')
    await menuBtn.click()
    await page.waitForTimeout(100)
    const sessionsBtn = page.locator('button[aria-label="Sessions"]')
    await sessionsBtn.click()
    await page.waitForTimeout(300)
  }

  // Input with text / indicator
  if (desc.includes('input') || desc.includes('indicator') || desc.includes('text')) {
    const textarea = page.locator('textarea[aria-label="Enter your prompt..."]')
    await textarea.fill('Hello world, this is a test message')
    await page.waitForTimeout(100)
  }

  // Pending state (after Enter)
  if (desc.includes('pending') || desc.includes('shimmer')) {
    const textarea = page.locator('textarea[aria-label="Enter your prompt..."]')
    await textarea.fill('Testing pending state')
    await textarea.press('Enter')
    await page.waitForTimeout(100)
  }

  // Double indicator (new session warning)
  if (desc.includes('double') || desc.includes('new session')) {
    const textarea = page.locator('textarea[aria-label="Enter your prompt..."]')
    await textarea.fill('Testing new session')
    await textarea.press('Enter')
    await page.waitForTimeout(100)
    await textarea.press('Enter')
    await page.waitForTimeout(100)
  }
}

async function takeScreenshot(description: string): Promise<string> {
  if (!existsSync(SCREENSHOTS_DIR)) {
    mkdirSync(SCREENSHOTS_DIR, { recursive: true })
  }

  // Use local time instead of UTC for timestamp
  const now = new Date()
  const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`
  const safeName = description.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const filename = `${timestamp}_${safeName}.png`
  const filepath = join(SCREENSHOTS_DIR, filename)

  console.log(`Taking screenshot: ${description}`)
  console.log(`Output: ${filepath}`)

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })

  try {
    await page.goto(DEV_SERVER_URL, { waitUntil: 'networkidle', timeout: 10000 })

    // Clear any auto-opened panels from localStorage state
    await page.evaluate(() => {
      localStorage.removeItem('dogma-settings-open')
    })
    await page.reload({ waitUntil: 'networkidle' })

    // Smart state preparation based on description
    await prepareState(page, description)

    await page.screenshot({ path: filepath, fullPage: false })
    console.log(`Screenshot saved: ${filepath}`)
    updateCurrentState()
  } catch (error) {
    console.error('Screenshot failed:', error)
    throw error
  } finally {
    await browser.close()
  }

  return filepath
}

const arg = process.argv[2]

if (!arg) {
  console.error('Usage: npm run screenshot -- "<description>"')
  console.error('       npm run screenshot -- --update-current')
  console.error('')
  console.error('Keywords that trigger interactions:')
  console.error('  "input", "text", "indicator" -> Types text in input')
  console.error('  "settings"                   -> Opens settings panel')
  console.error('  "session"                    -> Opens sessions panel')
  console.error('  "pending", "shimmer"         -> Shows pending state after Enter')
  console.error('  "double", "new session"      -> Shows double indicator (2x Enter)')
  console.error('')
  console.error('Examples:')
  console.error('  npm run screenshot -- "empty state"')
  console.error('  npm run screenshot -- "input with text and indicator"')
  console.error('  npm run screenshot -- "settings panel"')
  console.error('  npm run screenshot -- "pending shimmer state"')
  process.exit(1)
} else if (arg === '--update-current') {
  updateCurrentState()
} else {
  takeScreenshot(arg).catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
