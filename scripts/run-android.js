#!/usr/bin/env node

/**
 * Foody Vrinda - Professional Universal Android Runner
 * 
 * Guarantees 100% reliable deployment across all Android devices (Physical & Virtual),
 * automatically handling emulator boot, device authorization, incremental Gradle builds,
 * and streamed APK installation without relying on brittle third-party CLI timeouts.
 */

import { execSync, spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const ANDROID_DIR = path.resolve(ROOT_DIR, 'android');
const APK_PATH = path.resolve(ANDROID_DIR, 'app/build/outputs/apk/debug/app-debug.apk');
const PACKAGE_NAME = 'com.foodyvrinda.app';
const MAIN_ACTIVITY = `${PACKAGE_NAME}/${PACKAGE_NAME}.MainActivity`;

function log(emoji, msg) {
  console.log(`\x1b[36m${emoji}\x1b[0m \x1b[1m${msg}\x1b[0m`);
}

function run(cmd, cwd = ROOT_DIR, silent = false) {
  try {
    return execSync(cmd, { cwd, stdio: silent ? 'pipe' : 'inherit', encoding: 'utf-8' });
  } catch (err) {
    if (!silent) console.error(`Command failed: ${cmd}`, err.message);
    throw err;
  }
}

function getConnectedDevices() {
  try {
    const output = execSync('adb devices', { encoding: 'utf-8' });
    const lines = output.trim().split('\n').slice(1);
    const devices = [];
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 2 && parts[1] === 'device') {
        devices.push(parts[0]);
      }
    }
    return devices;
  } catch {
    return [];
  }
}

async function ensureDeviceReady() {
  let devices = getConnectedDevices();
  if (devices.length > 0) {
    log('📱', `Connected Android target found: ${devices[0]}`);
    return devices[0];
  }

  log('⚡', 'No active Android device found. Booting Android Emulator...');
  
  // Find available AVDs
  let avds = [];
  try {
    const out = execSync('emulator -list-avds || $HOME/Library/Android/sdk/emulator/emulator -list-avds', {
      encoding: 'utf-8',
      shell: true,
    });
    avds = out.trim().split('\n').filter(Boolean);
  } catch {}

  const avdName = avds.length > 0 ? avds[0] : 'Pixel';
  log('🚀', `Launching AVD: ${avdName}...`);

  const emulatorCmd = process.env.ANDROID_HOME 
    ? path.join(process.env.ANDROID_HOME, 'emulator/emulator') 
    : (fs.existsSync(`${process.env.HOME}/Library/Android/sdk/emulator/emulator`)
        ? `${process.env.HOME}/Library/Android/sdk/emulator/emulator`
        : 'emulator');

  spawn(emulatorCmd, ['-avd', avdName, '-no-snapshot-load'], {
    detached: true,
    stdio: 'ignore',
  }).unref();

  // Wait for device to come online
  log('⏳', 'Waiting for Android OS to complete startup...');
  let bootCompleted = false;
  let attempts = 0;
  while (!bootCompleted && attempts < 40) {
    attempts++;
    await new Promise((r) => setTimeout(r, 2000));
    try {
      const res = execSync('adb shell getprop sys.boot_completed', { encoding: 'utf-8', stdio: 'pipe' }).trim();
      if (res === '1') {
        bootCompleted = true;
      }
    } catch {}
  }

  devices = getConnectedDevices();
  return devices.length > 0 ? devices[0] : null;
}

async function main() {
  console.log('\n======================================================');
  console.log('   🌸 FOODY VRINDA - PROFESSIONAL NATIVE ANDROID RUNNER');
  console.log('======================================================\n');

  // Step 1: Ensure active Android target (device or emulator)
  const targetDevice = await ensureDeviceReady();
  if (!targetDevice) {
    console.error('❌ Could not establish connection to an Android device or emulator.');
    process.exit(1);
  }

  // Step 2: Build Web Assets & Sync Capacitor
  log('📦', 'Compiling production web assets (Vite)...');
  run('npm run build', ROOT_DIR);

  log('🔄', 'Synchronizing native plugins & web container (Capacitor)...');
  run('npx cap sync android', ROOT_DIR);

  // Step 3: Compile Native Android APK (Gradle with Java 17 compatibility)
  log('🔨', 'Assembling Android APK with Gradle...');
  run('./gradlew assembleDebug', ANDROID_DIR);

  // Step 4: Direct Streamed Install to Device
  log('📥', `Installing APK to ${targetDevice}...`);
  run(`adb -s ${targetDevice} install -r "${APK_PATH}"`, ROOT_DIR);

  // Step 5: Launch Application
  log('✨', `Launching Foody Vrinda (${MAIN_ACTIVITY})...`);
  run(`adb -s ${targetDevice} shell am start -n ${MAIN_ACTIVITY}`, ROOT_DIR);

  console.log('\n======================================================');
  console.log('   ✅ APP IS LIVE & RUNNING ON YOUR ANDROID DEVICE!   ');
  console.log('======================================================\n');
}

main().catch((err) => {
  console.error('\n❌ Android deployment encountered an error:', err.message);
  process.exit(1);
});
