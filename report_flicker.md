# Flicker Investigation Report

## Potential Causes for UI Flickering

1. **State Initialization & React Rendering Cycle:**
   When the app initially loads, the Zustand store's `loading` state might default to `true` (or `false` before quickly switching to `true`), causing an initial render of the "Empty folder" or a flash of the table before the API request completes.

2. **Authentication Flow (useAuth):**
   The `useAuth` hook likely starts with `isLoading: true` and `isAuthenticated: false`. The component might render a loading state, then quickly flip to the main Drive page. If `bootstrapDrive` takes a moment, the UI renders the skeleton of the Drive page before the data populates, causing a layout shift.

3. **Missing Server-Side Rendering (SSR) Hydration:**
   Since this is a Vite SPA (Single Page Application), the initial HTML is empty. The browser must download the JS, parse it, run the auth check, and then fetch the drive data. During this waterfall of requests, the UI shifts from empty -> auth loading -> drive loading -> populated table.

4. **React Strict Mode Double Invocation:**
   In development mode, React 18 runs `useEffect` twice. If `bootstrapDrive` isn't fully idempotent or if it toggles loading states rapidly during these twin invocations, it will cause visible flickering in the dev environment.

5. **CSS/Tailwind Loading:**
   Sometimes, if CSS chunks are loaded asynchronously or if fonts swap late, a Flash of Unstyled Content (FOUC) occurs.

## Recommendations (For Future Implementation)

- Consolidate loading states to show a single, cohesive splash screen until _both_ Auth and Drive metadata are ready.
- Use a skeleton loader that exactly matches the table dimensions to prevent layout shifts.
- Persist the last known UI state in `localStorage` to display it immediately while validating in the background (Stale-while-revalidate pattern).
