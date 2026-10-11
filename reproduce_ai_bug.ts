import puppeteer from 'puppeteer-core';
import http from 'node:http';

const PORT = 5174;
const PROXY_PORT = 3001;

function httpGet(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    }).on('error', reject);
  });
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('=== AI Provider UI + API Debug Reproduction ===\n');

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    defaultViewport: { width: 1400, height: 900 },
  });

  const page = await browser.newPage();
  const consoleLogs: any[] = [];
  const pageErrors: any[] = [];
  const responses: any[] = [];

  page.on('console', (msg) => {
    const text = msg.text();
    consoleLogs.push({ type: msg.type(), text });
    if (msg.type() === 'error') {
      console.log(`[CONSOLE ERROR] ${text}`);
    }
  });

  page.on('pageerror', (err) => {
    pageErrors.push({ message: err.message, stack: err.stack });
    console.log(`[PAGE ERROR] ${err.message}`);
    console.log(`[STACK] ${err.stack?.substring(0, 300)}`);
  });

  page.on('response', async (res) => {
    const url = res.url();
    if (url.includes('/api/ai/')) {
      try {
        const body = await res.text();
        responses.push({ url, status: res.status(), body: body.substring(0, 800) });
      } catch {}
    }
  });

  page.on('requestfailed', (req) => {
    console.log(`[NETWORK FAIL] ${req.url()} — ${req.failure()?.errorText}`);
  });

  try {
    // Navigate to AI page
    console.log('--- Opening AI page ---');
    await page.goto(`http://localhost:${PORT}/ai`, { waitUntil: 'networkidle0', timeout: 30000 });
    await sleep(2000);
    console.log('Page loaded');

    // Click "Configure AI Settings" button in the right panel
    console.log('\n--- Clicking Configure AI Settings ---');
    const settingsBtn = await page.evaluate(() => {
      // Look for the "Configure AI Settings" button in the right panel
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent?.includes('Configure AI Settings'));
      if (btn) {
        (btn as HTMLElement).click();
        return 'clicked Configure AI Settings';
      }
      // Fallback: look for any button with "Settings" text
      const settingsBtn = buttons.find(b => b.textContent?.toLowerCase().includes('settings') && !b.textContent?.toLowerCase().includes('system'));
      if (settingsBtn) {
        (settingsBtn as HTMLElement).click();
        return 'clicked fallback settings button: ' + settingsBtn.textContent?.trim();
      }
      return 'not found. Buttons: ' + buttons.filter(b => b.textContent?.trim()).map(b => b.textContent?.trim()).slice(0, 15).join(' | ');
    });
    console.log('Settings button result:', settingsBtn);
    await sleep(3000);
    await page.screenshot({ path: 'C:\\Users\\hamza\\AppData\\Local\\Temp\\kilo\\settings_modal_open.png', fullPage: true });

    // Check for modal and any errors
    const modalInfo = await page.evaluate(() => {
      const modal = document.querySelector('[class*="z-50"]');
      const errors = Array.from(document.querySelectorAll('[class*="error"]')).map(el => el.textContent?.trim()).filter(Boolean);
      const allText = modal?.innerText?.substring(0, 500) || 'no modal';
      return {
        modalExists: !!modal,
        modalText: allText,
        errors: errors.slice(0, 5)
      };
    });
    console.log('Modal info:', JSON.stringify(modalInfo, null, 2));

    // Look for Add Provider button
    console.log('\n--- Clicking Add Provider ---');
    const addResult = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent?.includes('Add Provider'));
      if (btn) {
        (btn as HTMLElement).click();
        return 'clicked Add Provider';
      }
      return 'not found';
    });
    console.log('Add Provider result:', addResult);

    await sleep(2000);
    await page.screenshot({ path: 'C:\\Users\\hamza\\AppData\\Local\\Temp\\kilo\\add_provider_form.png', fullPage: true });

    // Check if form is visible and fill it
    const formState = await page.evaluate(() => {
      const form = document.querySelector('form');
      const inputs = Array.from(document.querySelectorAll('input')).map(i => ({
        type: i.type,
        name: i.name,
        placeholder: i.placeholder,
        value: i.value
      }));
      return {
        formExists: !!form,
        inputs: inputs.slice(0, 10)
      };
    });
    console.log('Form state:', JSON.stringify(formState, null, 2));

    if (formState.formExists) {
      // Fill form
      console.log('\n--- Filling form ---');
      await page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('input'));
        inputs.forEach(input => {
          if (input.placeholder?.toLowerCase().includes('name') || input.name === 'name') {
            input.value = 'Test Provider Debug';
            input.dispatchEvent(new Event('input', { bubbles: true }));
          }
          if (input.placeholder?.toLowerCase().includes('http') || input.name === 'base_url') {
            input.value = 'https://openrouter.ai/api/v1';
            input.dispatchEvent(new Event('input', { bubbles: true }));
          }
          if (input.type === 'password' || input.name === 'api_key') {
            input.value = 'sk-test-fake-key-12345';
            input.dispatchEvent(new Event('input', { bubbles: true }));
          }
        });
      });
      console.log('Form filled');
      await page.screenshot({ path: 'C:\\Users\\hamza\\AppData\\Local\\Temp\\kilo\\form_filled.png', fullPage: true });

      // Submit
      console.log('\n--- Submitting form ---');
      await page.evaluate(() => {
        const form = document.querySelector('form');
        if (form) {
          const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
          form.dispatchEvent(submitEvent);
        }
      });
      await sleep(3000);
      await page.screenshot({ path: 'C:\\Users\\hamza\\AppData\\Local\\Temp\\kilo\\after_submit.png', fullPage: true });

      // Check result
      const resultInfo = await page.evaluate(() => {
        const modal = document.querySelector('[class*="z-50"]');
        const errors = Array.from(document.querySelectorAll('[class*="error"], [class*="red"]')).map(el => el.textContent?.trim()).filter(Boolean);
        return {
          modalExists: !!modal,
          text: modal?.innerText?.substring(0, 300),
          errors: errors.slice(0, 5)
        };
      });
      console.log('Submit result:', JSON.stringify(resultInfo, null, 2));

      // Look for test and power buttons
      console.log('\n--- Looking for controls ---');
      const controlsInfo = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return {
          testButtons: buttons.filter(b => b.title?.toLowerCase().includes('test') || b.textContent?.toLowerCase().includes('test')).map(b => b.title || b.textContent?.trim()),
          powerButtons: buttons.filter(b => b.title?.toLowerCase().includes('enable') || b.title?.toLowerCase().includes('disable') || b.title?.toLowerCase().includes('power')).map(b => b.title || b.textContent?.trim()),
        };
      });
      console.log('Controls info:', JSON.stringify(controlsInfo, null, 2));

      // Try clicking test button
      if (controlsInfo.testButtons.length > 0) {
        console.log('\n--- Clicking Test Connection ---');
        await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const testBtn = buttons.find(b => b.title?.toLowerCase().includes('test') || b.textContent?.toLowerCase().includes('test'));
          if (testBtn) {
            (testBtn as HTMLElement).click();
          }
        });
        await sleep(5000);
        await page.screenshot({ path: 'C:\\Users\\hamza\\AppData\\Local\\Temp\\kilo\\after_test.png', fullPage: true });
        
        const testResult = await page.evaluate(() => {
          const modal = document.querySelector('[class*="z-50"]');
          return {
            text: modal?.innerText?.substring(0, 300),
            errors: Array.from(document.querySelectorAll('[class*="error"]')).map(el => el.textContent?.trim()).filter(Boolean)
          };
        });
        console.log('Test result:', JSON.stringify(testResult, null, 2));
      }
    }

  } catch (err) {
    console.log('Error:', err);
    await page.screenshot({ path: 'C:\\Users\\hamza\\AppData\\Local\\Temp\\kilo\\error.png', fullPage: true });
  }

  console.log('\n=== SUMMARY ===');
  console.log('Console errors:', consoleLogs.filter(l => l.type === 'error').length);
  console.log('Page errors:', pageErrors.length);
  console.log('API responses:', responses.length);
  
  for (const err of pageErrors) {
    console.log('  PageError:', err.message);
    console.log('  Stack:', err.stack?.substring(0, 300));
  }
  
  for (const res of responses) {
    console.log(`  API ${res.status} ${res.url}`);
    console.log(`    ${res.body.substring(0, 300)}`);
  }

  await browser.close();
}

main().catch(console.error);
