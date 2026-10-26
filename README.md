# BookWorm front end

Netflix-style book browsing SPA: React 19, Vite 8, React Router DOM 7, `@supabase/supabase-js`. Spec and design references live in `app_outline/` (wireframes, user stories, `style_guide.md`). The backend (schema, migrations, Edge Functions) is in `../supabase/`.

## Status

- **Alpha complete:** front end built on seeded data.
- **Bravo complete:** books, public logs, and the libraries and logs of the seeded users come from Supabase (Postgres + RLS via PostgREST, plus a `sign-in` Edge Function).
- **Charlie complete:** books come live from Google Books through the `google-books` Edge Function. The `seed_books` table is no longer read by the app.
- **Delta built:** real Supabase Auth for everyone (sign-up, sign-in by email or display name, persisted session, password change).
- **Echo complete:** visual polish after an owner-approved audit at 390/768/1280 (plus 320, 1440, 1920 spot checks) against the wireframes and style guide, using mocked Google responses.
- **Remaining:** live Google Books QA, once the quota reset is confirmed.

## Run locally

Requires Node `^20.19.0 || >=22.12.0` (Vite 8 engine range).

```bash
cd front-end
cp .env.example .env     # then set the two values below
npm install
npm run dev       # Vite dev server
npm run build     # production build to dist/
npm run preview   # serve the production build
npm run lint      # eslint .
```

`.env` needs exactly two **public** values, both safe for the browser:

```
VITE_SUPABASE_URL=         # the Supabase project URL
VITE_SUPABASE_ANON_KEY=    # the public publishable (anon) key
```

The app throws at startup if either is missing. `.env` is gitignored; `.env.example` holds names only.

**The Google Books API key must NEVER appear in the front end, in any `VITE_` variable, the repo, or Vercel env vars.** It exists only as the `GOOGLE_BOOKS_SECRET` Supabase Edge Function secret. The browser never calls the Books API; it calls the `google-books` Edge Function through `supabase.functions.invoke`, and the only Google host it loads is the cover image CDN (`books.google.com`) via the https cover URLs in the data. Vercel holds only the public URL and anon key. The service-role key is never used by the front end.

## Demo logins

| Display name | Email | Password |
| --- | --- | --- |
| Demo User 1 | `demouser1@gmail.com` | `Password1!` |
| Demo User 2 | `demouser2@gmail.com` | `Password2@` |

Sign-in accepts the email **or** the display name. These are shared demo accounts (real Supabase Auth users), and their passwords cannot be changed in the UI. Several hidden reader accounts exist only to author extra logs and cannot be signed into.

## Routes

| Path | Page |
| --- | --- |
| `/` | Home: search, genre filter, book grid, My Library toggle (in-page state, no URL param) |
| `/details/:id` | Book details, reading status, public logs |
| `*` | Friendly 404 |

`vercel.json` rewrites every path to `/index.html`, so deep links and refresh work on Vercel.

## Structure

```
src/
  App.jsx, main.jsx   routes inside AppShell; providers mounted in main.jsx
  components/         AppShell, NavBar, BookCard, Modal, AuthModals, LogModal,
                      LogList, LibraryControls, FormField, Rating
  context/            Auth, Library and Toast contexts: *Context.js, *Provider.jsx,
                      use*.js hooks; authRules.js holds sign-up validation
  data/               searchBooks (+ getBook; calls the google-books function), getLogs (fetchLogs), genres,
                      libraryRules, logRules, index
  hooks/              useBookBrowser (search/genre/paging), useLogs (paged logs),
                      useSlowNote (slow-service hint after 6s)
  lib/                supabaseClient.js (the one shared client)
  pages/              Home, Details, NotFound
  styles/             tokens.css (design tokens), base.css, components.css
```

## Data-access seams

The UI talks only to these async functions; each phase swaps an implementation, not the components.

| Seam | What it does now |
| --- | --- |
| `data/searchBooks.js`: `searchBooks({ query, genre, startIndex, maxResults = 20, ids })` returns `{ items, totalItems }`; `getBook(id)` returns a book or `null` | Calls the `google-books` Edge Function (`action: search | get | ids`): title-only search, optional genre, `startIndex`/`maxResults` paging (max 20 per batch here, function allows 40; `startIndex` capped at 200, exported as `MAX_START_INDEX`). Errors are thrown with a `.code` (`bad_request`, `not_found`, `rate_limited`, `upstream_unavailable`, `not_configured`, `network`) and a friendly message; one automatic retry on `upstream_unavailable`/network failure only. With `ids` (My Library) it fetches the volumes by id in chunks of 40, keeps the caller's order (newest added first), filters by title client-side, and returns `failed` ids (books Google could not serve right now) instead of failing the list. `getBook` returns `null` for an unknown id. |
| `data/getLogs.js`: `fetchLogs({ bookId, startIndex, maxResults = 3 })` returns `{ items, totalItems }` | Public logs for a book, newest first, selected from `logs` with the author's `profiles(display_name)` embedded. Readable signed out. The author is a display name; email is never selected. |
| `context/AuthProvider.jsx`: `signIn`, `signUp`, `signOut`, `changePassword` | Real Supabase Auth only. `signIn` calls the `sign-in` Edge Function (it resolves email or display name server-side; the email never reaches the browser, errors use one uniform message), then `setSession`. `signUp` pre-checks the display name in `profiles`, then calls `supabase.auth.signUp` with `data.display_name` (the `on_auth_user_created` trigger creates the profile); with Confirm email OFF the user is signed in immediately. Friendly error mapping covers email in use, name taken or not allowed, password rules, rate limit and offline. `currentUser` is `{ id, displayName, email }`; `authLoading` avoids a signed-out flash on load. `changePassword` is described under Auth model. |
| `context/LibraryProvider.jsx`: `addToLibrary`, `removeFromLibrary`, `setReadingState`, `saveLog`, `deleteLog` return `{ ok, error }` | Reads and writes `library_items` and `logs` through Supabase under RLS for the signed-in user (the database enforces the library FK and the cascade); signed out has no library and refuses writes. |

## Auth model (Delta)

- Everyone is a real Supabase Auth user; there are no local or in-memory accounts. All libraries and logs live in the database.
- The session persists across refresh (`persistSession: true`, `autoRefreshToken`). The supabase-js token sits in browser storage; no app data is stored there. `authLoading` holds the UI until the stored session is resolved.
- Home remounts as a blank slate on sign-in and sign-out, and Back from Details always lands on a clean `/`.
- Requires the dashboard setting Authentication > Providers > Email > Confirm email = OFF.
- Password change (Profile modal): needs the Current Password, verified on a throwaway non-persisting client via `signInWithPassword`, then `auth.updateUser`. The new password must differ from the current one and meet the minimum length. After 5 wrong attempts the form locks for 30 s (client-side only, resets on page load). Disabled for the shared demo accounts (detected by display name Demo User 1/2).
- Buttons read "Sign-In" and "Sign-Out".

## Behaviors and decisions

- Search is title-only and submit-based (button or Enter). Genre applies immediately and defaults to blank (All), which the function scopes to "technology" (every query is scoped to technology by design); each genre adds a Google `subject:` filter. The genre dropdown is disabled in My Library (library books carry no genre).
- Home shows loading skeletons, a "Still searching. The book service is slow right now." note after 6 seconds, an error panel with Try again, and an empty state. Details has the same loading, slow note, error with Try again, and not-found states. A failed Load More shows its own Try again.
- Load More appends the next batch (`maxResults` 20), drops duplicate ids, and stops at `startIndex` > 200 or when the reported total is reached. Google's `totalItems` is unreliable, so Home shows "N books shown" (the count loaded so far) rather than a total. Logs page in 3s.
- My Library is in-page state (not in the URL); Back from Details always returns to a blank Home. Library lists newest added first. Library search refetches the whole library from Google (by id) and filters titles client-side. If some library books cannot be loaded, the page says how many are missing.
- Known Google behaviors: frequent 503s (the function and client retry), some title searches legitimately return 0 results (for example "python" combined with technology), and unknown ids answer 503.
- The reading-status dropdown is always enabled. Choosing a status on an unshelved book adds it to the library; "Not set" stores a null status.
- A log (one per user per book) requires the book to be in the user's library; removing the book deletes its log. Users have full CRUD on their own log and read-only access to others'. Log body is capped at 2000 characters.
- Display names are unique and immutable. The Profile modal shows name and email read-only; the only action is changing the password (see Auth model).
- Accessibility: modals use `role="dialog"`, `aria-modal` and a labelled title; toasts use one persistent polite `role="status"` region. `prefers-reduced-motion` is honored in `base.css` and `components.css`.
- Design tokens in `styles/tokens.css` follow `app_outline/style_guide.md`: near-black background, off-white text, blue = call to action, green = create, crimson = delete, 3:4 cards with placeholder frames, 44px touch targets.
- No `localStorage` or `sessionStorage` for app data.
- Layout (Echo): the nav is a 3-column grid (`minmax(0,1fr) auto minmax(0,1fr)`), so the title is truly centered and long display names ellipsize at 390px and below. All message blocks (`.empty`, `.notfound`, `.notice`, Details error) share one centered alignment; their buttons are full-width on mobile and at least 200px wide, centered, from 768px.
- Controls (Echo): input, select and textarea borders use `--border-control` (#7a7a86, at least 3:1 on page and modal surfaces). The password Show/Hide toggle sits inside the input.
- Toast: shown at the bottom of the screen, and moves to the top while a modal is open.
- My Library toggle: solid green with a darker pressed state and a check mark (`aria-pressed` kept). The filter row stacks into 2 rows from 768 to 1023px and is a single row from 1024px. The library empty-state count line is hidden while the empty block shows.
- Cards and Details (Echo): missing covers show a "Cover not provided" placeholder; card titles wrap anywhere. On Details, fact values are top-aligned, the logs column aligns with the hero/facts edge, and Load More and the library control stack share `--action-w` (280px) and are centered on desktop. When the book fails to load, public logs stay visible without the cover-column indent (`LogList` `solo` prop). The loading skeleton matches the real cover width.
- New tokens: `--border-control`, `--border-control-hover`, `--create-pressed`, `--create-pressed-hover`, `--action-w`.

## Verification done

- Alpha: Playwright screenshots compared against the wireframes per sub-phase, the full user journey, Lighthouse accessibility 100, text and action colors checked against AA.
- Bravo: network checks showed requests only to Supabase endpoints, authenticated with the user JWT, and no service-role key in the bundle. RLS was verified in the database.
- Echo: Playwright audit at 390/768/1280 (320, 1440, 1920 spot checks) with mocked Google responses, before and after fixes.
- `npm run lint` and `npm run build` are used as sub-phase gates.

## Known gaps

- `prefers-reduced-motion` is written but not tested in a browser.
- The production build (`vite preview` / Vercel) has not been browser-tested.
- No automated tests; verification was manual and Playwright-driven.
- Behavior after token expiry or refresh failure is untested.
- The client-side password-attempt lock is per page load, so it is a courtesy, not a security control (Supabase Auth rate limits are the real one).
- The Profile modal's password control may still carry a "Reset Password" label although the action is a password change; it is disabled for the shared demo accounts.
- Both Edge Functions answer CORS `*`; lock to the deployed domain.
- Google quota exhaustion and 503s can surface as errors; live Google QA is pending the quota reset.
- Echo not verified: real device or real font stack for the display-name ellipsis, hover states, widths above 1920px, real Google covers, the native select dropdown popup, toasts that require saving. Left as is by owner decision: the last grid row stays centered; ghost-button borders, section heading sizes and the modal backdrop seam.
- The bundle is about 528 kB and Vite emits a chunk-size warning.
- Lighthouse SEO was not re-run (`public/robots.txt` exists).
