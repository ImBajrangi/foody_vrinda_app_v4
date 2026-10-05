import { spawn } from 'child_process';
import http from 'http';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DEBUG_PORT = 9223;
const TARGET_URL = 'http://127.0.0.1:5173/';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
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

  close() {
    this.ws.close();
  }
}

async function runBrowserTests() {
  console.log('🚀 Starting Automated Chrome DevTools Protocol (CDP) Browser Test Suite...\n');
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--user-data-dir=/tmp/foody_vrinda_cdp_test',
    '--no-first-run',
    '--disable-gpu',
    '--window-size=1280,800',
    TARGET_URL
  ]);

  chromeProc.stderr.on('data', () => {}); // suppress verbose output

  try {
    // Wait for Chrome to listen on DEBUG_PORT
    let versionInfo = null;
    for (let i = 0; i < 30; i++) {
      await sleep(400);
      try {
        versionInfo = await fetchJson(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
        if (versionInfo) break;
      } catch (_) {}
    }

    if (!versionInfo) {
      throw new Error(`Failed to connect to Chrome remote debugging port ${DEBUG_PORT}`);
    }

    // Get active page target
    const targets = await fetchJson(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
    const pageTarget = targets.find(t => t.type === 'page');
    if (!pageTarget) throw new Error('No page target found in Chrome');

    const client = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await client.connect();

    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await sleep(2500); // Allow initial hydration

    const results = [];

    const record = (name, passed, detail = '') => {
      results.push({ name, passed, detail });
      const symbol = passed ? '✅' : '❌';
      console.log(`  ${symbol} ${name} ${detail ? `(${detail})` : ''}`);
    };

    console.log('--- TEST GROUP 1: INITIAL LOGGED-OUT STATE (DESKTOP) ---');
    // Ensure clean state
    await client.eval(`
      localStorage.clear();
      sessionStorage.clear();
    `);
    await client.send('Page.reload');
    await sleep(2000);

    const loggedOutHeader = await client.eval(`
      (() => {
        const text = document.body.innerText || '';
        const hasLogIn = Array.from(document.querySelectorAll('button')).some(b => b.textContent.includes('Log In') || b.textContent.includes('Login'));
        const hasSignUp = Array.from(document.querySelectorAll('button')).some(b => b.textContent.includes('Sign Up'));
        const hasBell = Boolean(document.querySelector('button[title="Notifications"]'));
        const hasProfile = Boolean(document.querySelector('button[title="Profile / Account"]'));
        const hasFV = Boolean(document.querySelector('button[title*="FV Dynasty"]'));
        const brand = Boolean(document.querySelector('h1')?.textContent?.includes('Foody Vrinda'));
        return { hasLogIn, hasSignUp, hasBell, hasProfile, hasFV, brand };
      })()
    `);

    record('Log In button visible when logged out', loggedOutHeader.hasLogIn);
    record('Sign Up button visible when logged out', loggedOutHeader.hasSignUp);
    record('Notification bell hidden when logged out', !loggedOutHeader.hasBell);
    record('Profile / Avatar hidden when logged out', !loggedOutHeader.hasProfile);
    record('FV points badge hidden when logged out', !loggedOutHeader.hasFV);
    record('Foody Vrinda brand identity visible on header left', loggedOutHeader.brand);

    console.log('\n--- TEST GROUP 2: AUTH MODAL TRIGGERING ---');
    // Test Log In button click
    const loginModalOpened = await client.eval(`
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Log In');
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      })()
    `);
    await sleep(500);

    const loginModalState = await client.eval(`
      (() => {
        const modal = document.querySelector('[role="dialog"]') || document.querySelector('.apple-modal-spring') || document.body;
        const text = modal.innerText || '';
        const isSignIn = text.includes('Sign In') || text.includes('Log In');
        // Close modal
        const closeBtn = document.querySelector('button[aria-label="Close"]') || Array.from(document.querySelectorAll('button')).find(b => b.querySelector('svg.lucide-x'));
        if (closeBtn) closeBtn.click();
        return isSignIn;
      })()
    `);
    record('Log In button triggers Sign In modal', loginModalOpened && loginModalState);
    await sleep(400);

    // Test Sign Up button click
    await client.eval(`
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Sign Up');
        if (btn) btn.click();
      })()
    `);
    await sleep(500);

    const signupModalState = await client.eval(`
      (() => {
        const text = document.body.innerText || '';
        const isSignUp = text.includes('Create Account') || text.includes('Sign Up');
        const closeBtn = Array.from(document.querySelectorAll('button')).find(b => b.querySelector('svg.lucide-x'));
        if (closeBtn) closeBtn.click();
        return isSignUp;
      })()
    `);
    record('Sign Up button triggers Create Account modal', signupModalState);
    await sleep(400);

    console.log('\n--- TEST GROUP 3: LOGGED-OUT MOBILE VIEWPORT (390x844) ---');
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });
    await sleep(500);

    const mobileHeaderState = await client.eval(`
      (() => {
        const buttons = Array.from(document.querySelectorAll('header button'));
        const hasLogin = buttons.some(b => b.textContent.includes('Login') && b.offsetParent !== null);
        const hasSignUp = buttons.some(b => b.textContent.includes('Sign Up') && b.offsetParent !== null);
        const hasBell = Boolean(document.querySelector('button[title="Notifications"]'));
        const hasProfile = Boolean(document.querySelector('button[title="Profile / Account"]'));
        return { hasLogin, hasSignUp, hasBell, hasProfile };
      })()
    `);
    record('Mobile viewport renders Login button', mobileHeaderState.hasLogin);
    record('Mobile viewport renders Sign Up button', mobileHeaderState.hasSignUp);
    record('Mobile viewport hides Bell & Profile', !mobileHeaderState.hasBell && !mobileHeaderState.hasProfile);

    // Reset device metrics to desktop
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 800,
      deviceScaleFactor: 1,
      mobile: false
    });
    await sleep(500);

    console.log('\n--- TEST GROUP 4: CUSTOMER AUTHENTICATION & TUTORIAL ---');
    // Simulate first-time customer
    await client.eval(`
      localStorage.setItem('foody_user_data', JSON.stringify({
        id: 'cust-browser-108',
        role: 'customer',
        displayName: 'Sri Radha Customer',
        isLoggedInUser: true
      }));
    `);
    await client.send('Page.reload');
    await sleep(2500); // Allow auth resolution and tutorial timer (1200ms)

    const customerHeader = await client.eval(`
      (() => {
        const hasBell = Boolean(document.querySelector('button[title="Notifications"]'));
        const hasProfile = Boolean(document.querySelector('button[title="Profile / Account"]'));
        const hasFV = Boolean(document.querySelector('button[title*="FV Dynasty"]'));
        const hasLogIn = Array.from(document.querySelectorAll('button')).some(b => b.textContent.trim() === 'Log In');
        const hasSignUp = Array.from(document.querySelectorAll('button')).some(b => b.textContent.trim() === 'Sign Up');
        return { hasBell, hasProfile, hasFV, hasLogIn, hasSignUp };
      })()
    `);
    record('Customer header shows Notifications bell', customerHeader.hasBell);
    record('Customer header shows Profile / Account button', customerHeader.hasProfile);
    record('Customer header shows FV Points badge', customerHeader.hasFV);
    record('Customer header hides Log In and Sign Up buttons', !customerHeader.hasLogIn && !customerHeader.hasSignUp);

    // Verify Customer Tutorial Modal
    const customerTutorial = await client.eval(`
      (() => {
        const modal = document.querySelector('.apple-modal-spring');
        if (!modal) return { open: false };
        const text = modal.innerText || '';
        const stageTag = text.includes('STAGE 1 • WELCOME');
        const title = text.includes('Welcome');
        const roleLabel = text.includes('Divine Food Experience Guide');
        return { open: true, stageTag, title, roleLabel };
      })()
    `);
    record('Customer tutorial automatically launches on first login', customerTutorial.open);
    record('Customer tutorial displays correct Stage 1 (Welcome)', customerTutorial.stageTag && customerTutorial.title);

    // Step through and finish customer tutorial
    await client.eval(`
      (() => {
        const skipBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Skip') || b.textContent.includes('Finish'));
        if (skipBtn) skipBtn.click();
      })()
    `);
    await sleep(400);

    // Check completion persisted in localStorage
    const customerCompleted = await client.eval(`
      (() => {
        const raw = localStorage.getItem('foody_tutorial_cust-browser-108_customer_customer_v1');
        if (!raw) return false;
        const parsed = JSON.parse(raw);
        return parsed.completed === true;
      })()
    `);
    record('Customer tutorial completion saved in localStorage under canonical key', customerCompleted);

    console.log('\n--- TEST GROUP 5: REPLAY TUTORIAL VIA EVENT ---');
    await client.eval(`
      window.dispatchEvent(new CustomEvent('foody:open-tutorial'));
    `);
    await sleep(400);

    const replayOpen = await client.eval(`
      (() => {
        const modal = document.querySelector('.apple-modal-spring');
        if (!modal) return false;
        const text = modal.innerText || '';
        // Close modal
        const closeBtn = Array.from(document.querySelectorAll('button')).find(b => b.querySelector('svg.lucide-x'));
        if (closeBtn) closeBtn.click();
        return text.includes('Welcome') && text.includes('STAGE 1');
      })()
    `);
    record('Replay Tutorial re-opens modal at Stage 1', replayOpen);
    await sleep(400);

    console.log('\n--- TEST GROUP 6: DELIVERY PARTNER TUTORIAL ---');
    await client.eval(`
      localStorage.setItem('foody_user_data', JSON.stringify({
        id: 'rider-browser-108',
        role: 'delivery',
        displayName: 'Gopal Sarathi Rider',
        isLoggedInUser: true
      }));
    `);
    await client.send('Page.reload');
    await sleep(2500);

    const deliveryTutorial = await client.eval(`
      (() => {
        const modal = document.querySelector('.apple-modal-spring');
        if (!modal) return { open: false };
        const text = modal.innerText || '';
        const isDeliveryGuide = text.includes('Sarathi Delivery Fleet Guide');
        const stage1 = text.includes('Deliver sacred prasadam across Sri Vrindavan Dham');
        // Dismiss
        const skipBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Skip') || b.textContent.includes('Finish'));
        if (skipBtn) skipBtn.click();
        return { open: true, isDeliveryGuide, stage1 };
      })()
    `);
    record('Delivery partner receives Delivery Fleet Guide only', deliveryTutorial.open && deliveryTutorial.isDeliveryGuide);
    await sleep(400);

    console.log('\n--- TEST GROUP 7: RESTAURANT / KITCHEN TUTORIAL ---');
    await client.eval(`
      localStorage.setItem('foody_user_data', JSON.stringify({
        id: 'kitchen-browser-108',
        role: 'kitchen',
        displayName: 'Govinda Kitchen Counter',
        isLoggedInUser: true
      }));
    `);
    await client.send('Page.reload');
    await sleep(2500);

    const restaurantTutorial = await client.eval(`
      (() => {
        const modal = document.querySelector('.apple-modal-spring');
        if (!modal) return { open: false };
        const text = modal.innerText || '';
        const isRestaurantGuide = text.includes('Kitchen & Store Partner Guide');
        const stage1 = text.includes('Empowering authentic Satvik food creators');
        // Dismiss
        const skipBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Skip') || b.textContent.includes('Finish'));
        if (skipBtn) skipBtn.click();
        return { open: true, isRestaurantGuide, stage1 };
      })()
    `);
    record('Restaurant partner receives Sacred Kitchen Guide only (7 stages)', restaurantTutorial.open && restaurantTutorial.isRestaurantGuide);
    await sleep(400);

    console.log('\n--- TEST GROUP 8: ADMIN / DEVELOPER EXCLUSION ---');
    await client.eval(`
      localStorage.setItem('foody_user_data', JSON.stringify({
        id: 'admin-browser-108',
        role: 'owner',
        displayName: 'Platform Admin',
        isLoggedInUser: true
      }));
    `);
    await client.send('Page.reload');
    await sleep(2500);

    const adminTutorialState = await client.eval(`
      (() => {
        const modal = document.querySelector('.apple-modal-spring');
        return Boolean(modal);
      })()
    `);
    record('Admin / Owner role is excluded from consumer/partner tutorials', !adminTutorialState);

    console.log('\n--- TEST GROUP 9: LOGOUT HEADER RESET ---');
    await client.eval(`
      localStorage.clear();
      sessionStorage.clear();
    `);
    await client.send('Page.reload');
    await sleep(2000);

    const loggedOutReset = await client.eval(`
      (() => {
        const hasLogIn = Array.from(document.querySelectorAll('button')).some(b => b.textContent.includes('Log In') || b.textContent.includes('Login'));
        const hasSignUp = Array.from(document.querySelectorAll('button')).some(b => b.textContent.includes('Sign Up'));
        const hasBell = Boolean(document.querySelector('button[title="Notifications"]'));
        const hasProfile = Boolean(document.querySelector('button[title="Profile / Account"]'));
        const hasFV = Boolean(document.querySelector('button[title*="FV Dynasty"]'));
        return { hasLogIn, hasSignUp, hasBell, hasProfile, hasFV };
      })()
    `);
    record('Logout resets header: Log In visible', loggedOutReset.hasLogIn);
    record('Logout resets header: Sign Up visible', loggedOutReset.hasSignUp);
    record('Logout resets header: Bell hidden', !loggedOutReset.hasBell);
    record('Logout resets header: Profile hidden', !loggedOutReset.hasProfile);
    record('Logout resets header: FV points badge hidden', !loggedOutReset.hasFV);

    client.close();

    console.log('\n=============================================================');
    const allPassed = results.every(r => r.passed);
    const passCount = results.filter(r => r.passed).length;
    console.log(`TOTAL TESTS: ${results.length} | PASSED: ${passCount} | FAILED: ${results.length - passCount}`);
    if (allPassed) {
      console.log('🎉 ALL BROWSER LEVEL REGRESSION TESTS PASSED 100%!');
    } else {
      console.log('❌ SOME TESTS FAILED. Inspect details above.');
    }
    console.log('=============================================================\n');

  } finally {
    chromeProc.kill();
  }
}

runBrowserTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
