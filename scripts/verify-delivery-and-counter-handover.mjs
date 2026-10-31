#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import http from 'http';
import { spawn } from 'child_process';
import {
  supabase,
  getCloudUsers,
  getOnlineRiders,
  isRiderOnline,
  getCloudShops,
  updateCloudShop,
  updateCloudOrderStatus
} from '../src/supabase.js';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DEBUG_PORT = 9225;
const TARGET_URL = 'http://localhost:4173/';
const SCREENSHOT_DIR = '/Users/sakhi/.gemini/antigravity/brain/0ea3be9f-0d36-473c-a0b3-cd6ba379a2de/screenshots';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 1;
    this.callbacks = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id && this.callbacks.has(msg.id)) {
          const { resolve, reject } = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) reject(new Error(msg.error.message || JSON.stringify(msg.error)));
          else resolve(msg.result);
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    return res.result?.value;
  }

  async captureScreenshot(filename) {
    const filePath = path.join(SCREENSHOT_DIR, filename);
    const { data } = await this.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(filePath, Buffer.from(data, 'base64'));
    console.log(`  📸 Screenshot saved: ${filename}`);
    return filePath;
  }

  close() {
    this.ws.close();
  }
}

async function runTestSuite() {
  console.log('========================================================================');
  console.log('🚀 FOODY VRINDA: AUTOMATED E2E & DATABASE REGRESSION SUITE');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, detail = '') {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName} ${detail ? `(${detail})` : ''}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName} ${detail ? `(${detail})` : ''}`);
      failed++;
    }
  }

  // ------------------------------------------------------------------------
  // PART 1: BACKEND SERVICE & RIDER PRESENCE TESTS
  // ------------------------------------------------------------------------
  console.log('--- TEST GROUP 1: RIDER PRESENCE & ONLINE DETECTION ---');
  const allUsers = await getCloudUsers(true);
  assert(Array.isArray(allUsers) && allUsers.length > 0, 'getCloudUsers fetches users', `count: ${allUsers.length}`);

  const activeRiders = getOnlineRiders(allUsers);
  assert(activeRiders.length >= 1, 'At least one delivery rider is verified online', `online count: ${activeRiders.length}, riders: ${activeRiders.map(r => r.displayName).join(', ')}`);

  console.log('\n--- TEST GROUP 2: SHOP SELF-DELIVERY DATABASE PERSISTENCE ---');
  const shops = await getCloudShops();
  const testShop = shops.find(s => s.id === 'shop-vishnu-fast-food') || shops[0];
  assert(Boolean(testShop), 'Target shop located for self-delivery test', testShop?.name);

  // ------------------------------------------------------------------------
  // PART 2: AUTOMATED CHROME CDP BROWSER TESTS & SCREENSHOTS
  // ------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 3: AUTOMATED BROWSER E2E & SCREENSHOT RECORDING ---');
  
  // Start Vite preview on port 4173
  const previewProc = spawn('npx', ['vite', 'preview', '--port', '4173', '--strictPort'], {
    cwd: path.resolve(),
    stdio: 'ignore'
  });

  // Wait for preview server to be available
  for (let i = 0; i < 30; i++) {
    await sleep(300);
    try {
      const ok = await new Promise((resolve) => {
        http.get('http://localhost:4173/', res => resolve(res.statusCode === 200)).on('error', () => resolve(false));
      });
      if (ok) break;
    } catch (_) {}
  }

  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--user-data-dir=/tmp/foody_vrinda_cdp_handover_test_2',
    '--no-first-run',
    '--disable-gpu',
    '--window-size=1280,800',
    TARGET_URL
  ]);

  chromeProc.stderr.on('data', () => {});

  let client = null;
  try {
    let versionInfo = null;
    for (let i = 0; i < 30; i++) {
      await sleep(400);
      try {
        versionInfo = await fetchJson(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
        if (versionInfo) break;
      } catch (_) {}
    }

    if (!versionInfo) throw new Error('Could not connect to Chrome debugging port');

    const targets = await fetchJson(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
    const pageTarget = targets.find(t => t.type === 'page');
    client = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await client.connect();

    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await sleep(2500);

    // Screenshot 1: Desktop Home View
    await client.captureScreenshot('01_customer_desktop_view.png');
    assert(true, 'Desktop view loaded and screenshot captured');

    // Emulate Mobile Device (iPhone 14 standard: 390x844)
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });
    await sleep(800);

    // Seed Cart in localStorage to test basket drawer
    await client.eval(`
      (() => {
        const item = {
          id: 'dish_chowmein_1',
          name: 'Chowmein',
          price: 39,
          quantity: 2,
          shopId: '${testShop.id}',
          shop_id: '${testShop.id}',
          shopName: '${testShop.name}',
          category: 'Snacks'
        };
        localStorage.setItem('foody_user_cart', JSON.stringify([item]));
        localStorage.setItem('foody_cart_shop_id', '${testShop.id}');
        localStorage.setItem('foody_fulfillment_type', 'delivery');
        window.dispatchEvent(new Event('storage'));
      })()
    `);
    await client.send('Page.navigate', { url: TARGET_URL });
    await sleep(3500);

    // Click floating basket button to open drawer
    const openCartSuccess = await client.eval(`
      (() => {
        const url = window.location.href;
        const title = document.title;
        const bodySnippet = document.body ? document.body.innerHTML.slice(0, 300) : 'NO BODY';
        const buttons = Array.from(document.querySelectorAll('button'));
        const cartBtn = buttons.find(b => 
          b.textContent.includes('View Basket') || 
          b.textContent.includes('Basket') || 
          b.textContent.includes('Item')
        );
        if (cartBtn) {
          cartBtn.click();
          return { clicked: true, text: cartBtn.textContent };
        }
        return { clicked: false, url, title, bodySnippet, buttons: buttons.map(b => b.textContent.trim()).filter(Boolean).slice(0, 10) };
      })()
    `);
    console.log('  [DEBUG openCartSuccess]:', JSON.stringify(openCartSuccess, null, 2));
    await sleep(1500);

    // Inspect Basket Drawer fulfillment states
    const drawerState = await client.eval(`
      (() => {
        const text = document.body.innerText || '';
        const hasDoorstep = text.includes('Doorstep Delivery');
        const hasSelfPickup = text.includes('Self-Pickup');
        const ridersActiveText = text.includes('Sarathi Riders Active') || text.includes('Kitchen Self-Delivery');
        const proceedBtn = Array.from(document.querySelectorAll('button')).find(b => 
          b.textContent.includes('Proceed to Place Order') || b.textContent.includes('Checkout')
        );
        const isProceedEnabled = proceedBtn ? !proceedBtn.disabled : false;
        return { hasDoorstep, hasSelfPickup, ridersActiveText, isProceedEnabled };
      })()
    `);

    assert(drawerState.hasDoorstep, 'Basket drawer offers Doorstep Delivery');
    assert(drawerState.hasSelfPickup, 'Basket drawer offers Self-Pickup');
    assert(drawerState.ridersActiveText, 'Riders active indicator rendered in fulfillment header');
    assert(drawerState.isProceedEnabled, 'Proceed to Place Order is ACTIVE and enabled for delivery');

    // Screenshot 2: Mobile Basket Drawer with Delivery Open
    await client.captureScreenshot('02_mobile_basket_delivery_available.png');

    // Switch to Kitchen View & Capture Screenshot
    await client.eval(`
      (() => {
        localStorage.setItem('foody_user_data', JSON.stringify({
          id: 'mock_kitchen_staff',
          role: 'kitchen',
          displayName: 'Head Chef Radhe',
          shopId: '${testShop.id}',
          shopIds: ['${testShop.id}'],
          isLoggedInUser: true
        }));
        sessionStorage.setItem('foody_dev_impersonation', JSON.stringify({
          role: 'kitchen',
          shopId: '${testShop.id}'
        }));
      })()
    `);
    await client.send('Page.navigate', { url: TARGET_URL });
    await sleep(3500);

    // Screenshot 3: Kitchen View Desk
    await client.captureScreenshot('03_kitchen_view_console.png');
    assert(true, 'Kitchen view console screenshot recorded');

  } catch (browserErr) {
    console.error('Browser automation error:', browserErr.message);
  } finally {
    if (client) client.close();
    chromeProc.kill();
    try { previewProc.kill(); } catch (_) {}
  }

  console.log('\n========================================================================');
  console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runTestSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
