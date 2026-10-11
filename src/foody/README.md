# Foody Vrinda animations (React + Capacitor)

Two drop-in components, no animation library needed (~36 KB of source, plain DOM + requestAnimationFrame):

- `FoodySplash` - full-screen app-open splash (~4.2 s, speed prop to shorten)
- `FoodyOrderHop` - the squirrel's "order done" happy hop (~1.75 s) + calm idle

Files: `FoodySplash.jsx`, `FoodyOrderHop.jsx`, `foodySplash.core.js`, `foodyOrderHop.core.js`
(the `*.core.js` files are framework-agnostic; they hold the SVG paths and the animation code).

## 1. Copy
Put this folder at `src/foody/`. In a TypeScript project enable `"allowJs": true` (the core files start with `// @ts-nocheck`),
or rename the two `.jsx` files to `.tsx`.

## 2. Fonts (important in a Capacitor app: it must work offline)
```bash
npm i @fontsource/noto-sans-devanagari @fontsource/inter
```
```js
// main.jsx / index.jsx
import '@fontsource/noto-sans-devanagari/700.css';
import '@fontsource/inter/500.css';
```

## 3. Capacitor: native splash -> animated React splash
The native splash can only show a still image, so keep it a plain dark screen and let React play the animation.

```ts
// capacitor.config.ts
plugins: {
  SplashScreen: { launchAutoHide: false, backgroundColor: '#1B1B1D', showSpinner: false, launchShowDuration: 0 }
}
```
Use a solid `#1B1B1D` image for `splash.png` / `splash-dark.png` (e.g. via `@capacitor/assets`) so there is no logo flash
before the animation starts. Also set the status bar / theme colour to `#1B1B1D`.

```jsx
// App.jsx
import { useEffect, useState } from 'react';
import { SplashScreen } from '@capacitor/splash-screen';
import FoodySplash from './foody/FoodySplash';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  useEffect(() => { SplashScreen.hide({ fadeOutDuration: 100 }); }, []);   // hide native splash once React is up
  return (
    <>
      <Routes />
      {showSplash && <FoodySplash speed={1.3} onDone={() => setShowSplash(false)} />}
    </>
  );
}
```
Tip: show it only on a cold start (keep a module-level flag), and keep `speed` around 1.2-1.4 (~3 s) if 4.2 s feels long.

## 4. Order-done hop (web + app)
```jsx
import { useRef } from 'react';
import FoodyOrderHop from './foody/FoodyOrderHop';

// A) mount it on the confirmation screen (plays automatically)
<FoodyOrderHop width={220} background="#1B1B1D" />

// B) always mounted, play on demand
const hop = useRef();
<FoodyOrderHop ref={hop} autoplay={false} width={220} background="#1B1B1D" />
// when the order succeeds:
hop.current.play();
```
`onDone` fires when the hop has finished. The squirrel's face is the cream disc's negative space,
so on a white page give it a dark/orange `background` (or a dark card behind it).

## Notes
- `prefers-reduced-motion` is respected (static final frame, `onDone` fires after 0.6 s for the splash).
- Cleanup is handled on unmount (works with React StrictMode).
- Ears/tail/paws cannot move independently because the logo is flat; send a layered SVG if you want that.
