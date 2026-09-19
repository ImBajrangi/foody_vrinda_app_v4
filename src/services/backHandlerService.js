/**
 * Foody Vrinda - Centralized Back Button & Modal Hierarchy Manager
 * 
 * Manages LIFO (Last-In-First-Out) hardware/gesture back button handling.
 * Ensures that pressing back on Android / Mobile Browser gracefully closes
 * the topmost active modal/sheet/drawer rather than exiting the application.
 */

let backHandlers = [];
let lastExitPressTime = 0;

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
