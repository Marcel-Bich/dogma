import { chromium } from 'playwright'
import { existsSync, mkdirSync, copyFileSync } from 'fs'
import { join } from 'path'

const SCREENSHOTS_DIR = join(import.meta.dirname, '..', '..', 'screenshots')
const DEV_SERVER_URL = 'http://localhost:5173'

async function takeScreenshot(name?: string): Promise<string> {
  if (!existsSync(SCREENSHOTS_DIR)) {
    mkdirSync(SCREENSHOTS_DIR, { recursive: true })
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const filename = name ? `${timestamp}_${name}.png` : `${timestamp}.png`
  const filepath = join(SCREENSHOTS_DIR, filename)

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })

  try {
    await page.goto(DEV_SERVER_URL, { waitUntil: 'networkidle', timeout: 10000 })
    await page.screenshot({ path: filepath, fullPage: false })
    const currentStatePath = join(SCREENSHOTS_DIR, 'current-state.png')
    copyFileSync(filepath, currentStatePath)
    console.log(`Screenshot saved: ${filepath}`)
    console.log(`Current state updated: ${currentStatePath}`)
  } catch (error) {
    console.error('Screenshot failed:', error)
    throw error
  } finally {
    await browser.close()
  }

  return filepath
}

const name = process.argv[2]
takeScreenshot(name).catch((error) => {
  console.error(error)
  process.exit(1)
})
