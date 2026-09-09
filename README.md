# Foody Vrinda (v3)

Satvik Cloud Kitchen & Real-Time Temple Prasad Network for Vrindavan Dham.

---

## 🔐 Emergency Master Access & Lockout Prevention System

A 5-tier fail-safe hierarchy ensures developers and system administrators can never be locked out of the platform, even if all roles in the database are accidentally changed or deleted:

1. **Tier 1 (Whitelisted Master Accounts)**: Hard-coded protection for `developer@foodyvrinda.com` / `master_dev_108`. Protected against accidental deletion, demotion, or role stripping.
2. **Tier 2 (Global Emergency Keybinding)**: Press `Ctrl + Shift + D` (or `Cmd + Shift + D` on macOS) anywhere across the application to summon the Emergency Master Access modal.
3. **Tier 3 (Master God-Mode PIN)**: Unlock instantaneous Developer elevation with PIN `108108`.
4. **Tier 4 (URL Override)**: Access Developer mode anytime by navigating with the URL parameter `?dev_override=108`.
5. **Tier 5 (1-Click Recovery Tool)**: "Restore Master Dev Accounts" button in the Developer panel instantly resets seed administrative records in Supabase and local cache.

---

## ⚡ Architecture & Tech Stack

- **Frontend**: React 19 + Vite (Rolldown engine) + Tailwind CSS (Obsidian luxury aesthetic `#1E1B1C`).
- **Cloud Backend**: Supabase (PostgreSQL, Row Level Security, Realtime Channels).
- **Offline / Zero-Latency**: In-memory cache + `localStorage` SWR fallback with custom event broadcasting.
- **Audio & Alarms**: Web Audio synthesis for kitchen ticket alerts & rider dispatch chime.

---

## 🚀 Development & Build

```bash
# Start development server
npm run dev

# Build for production (Strict 0-error standard)
npm run build
```
