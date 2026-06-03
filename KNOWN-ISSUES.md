# Known issues (accepted, tracked)

Real-but-low-impact items intentionally deferred. Each is documented with why it's
acceptable now and what to do when it's worth addressing. None blocks launch.

---

## 1. Transitive `firebase-admin` CVEs (server-side)

**What:** `npm audit` reports ~8–9 **moderate** vulnerabilities. They are not in our
code or in `firebase-admin` directly — they're 2–3 levels down its dependency tree
(`firebase-admin` → `@google-cloud/firestore` → `google-gax` / `teeny-request` /
`retry-request` / `uuid`). Mostly low-impact edge cases (e.g. old `uuid` using
`Math.random()` instead of a crypto RNG). None is critical/RCE/data-exposure.

**Why accepted:**
- Server-side only — `firebase-admin` runs in Cloud Functions, never in the shipped
  app bundle or on user devices. Not reachable by a client-side attacker.
- `npm audit fix` produces no compatible patch; `npm audit fix --force` would
  downgrade/replace `firebase-admin` and likely break the functions deploy.
- Resolves upstream — Google bumps these in normal `firebase-admin` releases.

**When/how to fix:** routine maintenance. In `functions/`, run `npm update
firebase-admin` periodically, then `npm audit` to confirm the count drops. Re-deploy
functions and smoke-test.

**Severity:** Low · **Owner action:** maintenance cadence

---

## 2. ESLint warnings (12, cosmetic)

**What:** `npm run lint` reports 0 errors, 12 warnings, in three categories:
- `react-hooks/purity` — `Date.now()` called during render (e.g. the online-status
  helper in `OutlookInbox.jsx`). Technically "impure" per React 19 rules; harmless
  here (computes "active Nm ago" text).
- `react-hooks/set-state-in-effect` — `setState` inside a `useEffect` (one-time
  loads on mount, e.g. vibe votes from localStorage). Intentional.
- `react-hooks/exhaustive-deps` — a `useEffect` in `OutlookInbox` omits
  `profileCache` from its dep array. Deliberate (avoids unwanted re-runs).

**Why accepted:** none affects correctness, security, performance, or App Store
review (Apple never sees lint output). Fixing requires restructuring working render
logic — risk of introducing a real bug for no user-facing gain.

**When/how to fix:** post-launch cleanup. Move time reads into state + an interval
for the purity warnings; verify each effect's deps individually.

**Severity:** Cosmetic · **Owner action:** post-launch tidy-up

---

## 3. Global-feed 200-post cap

**What:** the global feed subscribes to the 200 newest posts
(`orderBy(timestamp desc) + limit(200)`). Some views (radar / "my posts" /
favorites feed) filter that in-memory set client-side rather than running their own
queries.

**Why accepted:** with a 7-day post TTL and 3 posts/user/day, total active posts
stay well under 200 for a long time, so "newest 200" effectively means "all active
posts." Behavior is identical to the old unbounded feed, just cost-capped. (See
PERFORMANCE.md for the read-cost rationale.)

**When it matters:** once >~200 posts are active simultaneously, the window stops
containing everything. Symptom: a post at a favorited bar, or an older own post,
occasionally not appearing because it fell outside the newest 200 globally.

**When/how to fix:** don't just raise the limit — give those views dedicated
server-side queries:
- "My posts" → `where("userId","==",me)` listener (always complete, cheap).
- Favorites feed → `where("venueId","in", favoritedBarIds)` batched in groups of 10
  (Firestore `in` limit).

**Severity:** Low (scale-dependent) · **Owner action:** when active posts approach ~200

---

_See also: PERFORMANCE.md (cost/scaling) and APPCHECK.md (App Check rollout)._
