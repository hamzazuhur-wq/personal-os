import puppeteer from 'puppeteer-core';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const DEV_SERVER = 'http://localhost:5173';

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log('Launching Edge...');
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const networkLog: any[] = [];
  const consoleLog: string[] = [];

  page.on('console', (msg) => {
    consoleLog.push(`[${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', (err) => {
    consoleLog.push(`[PAGE ERROR] ${err.message}\n${err.stack}`);
  });
  page.on('requestfailed', (req) => {
    networkLog.push({
      type: 'FAILED',
      method: req.method(),
      url: req.url(),
      error: req.failure()?.errorText,
    });
  });
  page.on('response', (res) => {
    const req = res.request();
    networkLog.push({
      type: 'RESPONSE',
      method: req.method(),
      url: req.url(),
      status: res.status(),
    });
  });
  page.on('request', (req) => {
    networkLog.push({
      type: 'REQUEST',
      method: req.method(),
      url: req.url(),
    });
  });

  console.log('Navigating to /ai...');
  await page.goto(DEV_SERVER + '/ai', { waitUntil: 'networkidle0', timeout: 60000 });
  await sleep(4000);

  console.log('=== Clicking AI Provider & Settings ===');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.textContent?.includes('AI Provider & Settings'));
    if (btn) (btn as HTMLElement).click();
  });
  await sleep(3000);

  console.log('=== Clicking Add Provider ===');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => /add provider/i.test(b.textContent || ''));
    if (btn) (btn as HTMLElement).click();
  });
  await sleep(2000);

  console.log('=== Filling form and submitting ===');
  await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input'));
    const nameInput = inputs.find(i => (i as HTMLInputElement).placeholder?.toLowerCase().includes('name') || (i as HTMLInputElement).placeholder?.toLowerCase().includes('openrouter'));
    const urlInput = inputs.find(i => (i as HTMLInputElement).placeholder?.toLowerCase().includes('http'));
    const keyInput = inputs.find(i => (i as HTMLInputElement).type === 'password');
    
    if (nameInput) (nameInput as HTMLInputElement).value = 'Test Provider';
    if (urlInput) (urlInput as HTMLInputElement).value = 'https://openrouter.ai/api/v1';
    if (keyInput) (keyInput as HTMLInputElement).value = 'sk-test-fake-key-12345';
    
    [nameInput, urlInput, keyInput].forEach(el => {
      if (el) {
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  });
  await sleep(1000);

  await page.evaluate(() => {
    const form = document.querySelector('form');
    if (form) form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
  await sleep(4000);

  console.log('=== Network log (last 30 entries) ===');
  networkLog.slice(-30).forEach((entry) => {
    console.log(JSON.stringify(entry));
  });

  console.log('=== Console log ===');
  consoleLog.forEach((msg) => console.log(msg));

  console.log('=== Page state ===');
  const pageState = await page.evaluate(() => ({
    htmlLength: document.body.innerHTML.length,
    hasModal: !!document.querySelector('.fixed.inset-0.z-50'),
    bodyText: document.body.innerText.substring(0, 300),
  }));
  console.log(JSON.stringify(pageState, null, 2));

  await page.screenshot({ path: 'C:\\Users\\hamza\\AppData\\Local\\Temp\\kilo\\after_full_flow.png', fullPage: false });

  await browser.close();
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
