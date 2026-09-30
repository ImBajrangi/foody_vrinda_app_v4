import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';

/**
 * Foody Vrinda - Centralized Back Button & Modal Hierarchy Manager
 * 
 * Manages LIFO (Last-In-First-Out) hardware/gesture back button handling.
 * Ensures that pressing back on Android / Mobile Browser gracefully closes
 * the topmost active modal/sheet/drawer rather than exiting the application,
 * and prioritizes keyboard/input dismissal before triggering any app back navigation.
 */

let backHandlers = [];
let lastExitPressTime = 0;
let isKeyboardOpen = false;
let lastKeyboardHideTimestamp = 0;
let isInitialized = false;

export function initKeyboardListeners() {
  if (isInitialized || typeof window === 'undefined') return;
  isInitialized = true;

  if (Capacitor.isNativePlatform()) {
    try {
      Keyboard.addListener('keyboardWillShow', () => {
        isKeyboardOpen = true;
      });
      Keyboard.addListener('keyboardDidShow', () => {
        isKeyboardOpen = true;
      });
      Keyboard.addListener('keyboardWillHide', () => {
        isKeyboardOpen = false;
        lastKeyboardHideTimestamp = Date.now();
      });
      Keyboard.addListener('keyboardDidHide', () => {
        isKeyboardOpen = false;
        lastKeyboardHideTimestamp = Date.now();
      });
    } catch (e) {
      console.warn('Capacitor Keyboard listener error:', e);
    }
  }

  // Web & DOM fallback focus tracking
  window.addEventListener('focusin', (e) => {
    const target = e.target;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)) {
      isKeyboardOpen = true;
    }
  }, { passive: true });

  window.addEventListener('focusout', () => {
    setTimeout(() => {
      const active = typeof document !== 'undefined' ? document.activeElement : null;
      const isInput = active && (
        active.tagName === 'INPUT' ||
        active.tagName === 'TEXTAREA' ||
        active.tagName === 'SELECT' ||
        active.isContentEditable
      );
      if (!isInput) {
        isKeyboardOpen = false;
        lastKeyboardHideTimestamp = Date.now();
      }
    }, 60);
  }, { passive: true });
}

if (typeof window !== 'undefined') {
  initKeyboardListeners();
}

/**
 * Checks if keyboard is active or was closed within recent milliseconds (debouncing OS back events).
 * If active, dismisses keyboard and returns true (consuming back press without triggering modal/screen back).
 */
export function handleKeyboardOrInputDismiss() {
  initKeyboardListeners();

  const now = Date.now();
  const activeEl = typeof document !== 'undefined' ? document.activeElement : null;
  const isInputFocused = activeEl && (
    activeEl.tagName === 'INPUT' ||
    activeEl.tagName === 'TEXTAREA' ||
    activeEl.tagName === 'SELECT' ||
    activeEl.isContentEditable
  );

  // 1. If an input is actively focused
  if (isInputFocused) {
    try {
      activeEl.blur();
    } catch (_) {}
    if (Capacitor.isNativePlatform()) {
      try {
        Keyboard.hide().catch(() => {});
      } catch (_) {}
    }
    isKeyboardOpen = false;
    lastKeyboardHideTimestamp = now;
    return true; // Consumed!
  }

  // 2. If native keyboard is known to be open
  if (isKeyboardOpen) {
    if (Capacitor.isNativePlatform()) {
      try {
        Keyboard.hide().catch(() => {});
      } catch (_) {}
    }
    isKeyboardOpen = false;
    lastKeyboardHideTimestamp = now;
    return true; // Consumed!
  }

  // 3. If keyboard was dismissed within the last 400ms, the OS back event is part of the keyboard closing gesture
  if (now - lastKeyboardHideTimestamp < 400) {
    lastKeyboardHideTimestamp = 0;
    return true; // Consumed!
  }

  return false;
}

export function registerBackHandler(id, handler, priority = 0) {
  if (!id || typeof handler !== 'function') return;
  // Remove existing with same id
  backHandlers = backHandlers.filter(h => h.id !== id);
  backHandlers.push({ id, handler, priority, timestamp: Date.now() });
  // Sort descending: highest priority first, then most recently registered first
  backHandlers.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return b.timestamp - a.timestamp;
  });
}

export function unregisterBackHandler(id) {
  if (!id) return;
  backHandlers = backHandlers.filter(h => h.id !== id);
}

export function hasActiveBackHandlers() {
  return backHandlers.length > 0;
}

export function executeTopBackHandler() {
  if (backHandlers.length === 0) return false;
  const top = backHandlers.shift();
  if (top && typeof top.handler === 'function') {
    try {
      top.handler();
      return true;
    } catch (err) {
      console.warn(`Error executing back handler '${top.id}':`, err);
      return false;
    }
  }
  return false;
}

/**
 * Checks whether an exit press should be allowed or throttled (Double-Back-To-Exit)
 * Returns true if user pressed back twice within 2000ms, otherwise false.
 */
export function shouldAllowAppExit() {
  const now = Date.now();
  if (now - lastExitPressTime < 2000) {
    return true;
  }
  lastExitPressTime = now;
  return false;
}

export function resetExitPressTimer() {
  lastExitPressTime = 0;
}
