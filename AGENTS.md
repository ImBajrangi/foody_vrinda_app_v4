# Foody Vrinda v3 — Project Commands & Rules

## Commands
- **Run directly on connected Android device / emulator**: `npm run android`
- **Open native project in Android Studio**: `npm run android:open`
- **Build production debug APK**: `npm run android:build`
- **Sync Web updates to Android**: `npm run sync`

---

## Active Engineering Rules

### Rule [Native Bottom Sheet Invariant]:
"Interactive bottom sheets and swipe-down drawers must never use CSS keyframe animations with fill-mode: both/forwards or :not(.sheet-dragging) selectors. Dismissal transitions must interpolate continuously from the user's release position (translate3d(0, ${finalDiff}px, 0)) to 105% with cubic-bezier(0.32, 0.72, 0, 1) without premature React re-renders or origin resets."

### Rule [Mobile Touch-First Standard]:
"All hover styles (hover:...) must be scoped strictly to @media (hover: hover) and (pointer: fine). Touch interactions must rely solely on :active micro-scale feedback (scale(0.975)) with zero sticky hover artifacts."

### Rule [GPU Budget Guard]:
"Avoid continuous looping CSS animations (animate-pulse, infinite keyframe loops, dynamic blur filters) on mobile viewports (max-width: 768px) to ensure 60fps responsiveness and zero thermal throttling on all phone segments."
