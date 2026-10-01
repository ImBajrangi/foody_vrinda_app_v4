# Foody Vrinda (v3)

Satvik Cloud Kitchen & Real-Time Temple Prasad Network for Vrindavan Dham.

---

## 🔐 Emergency Recovery

Administrative lockout recovery is handled via server-side break-glass mechanisms.
Credentials and override procedures are stored in the team's secure vault — **never in source control**.

See internal documentation for recovery procedures.

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
