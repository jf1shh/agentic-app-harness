# Test the Artifact You Ship, at Every Origin It Ships To

Android launch review (2026-10-06): an origin can load correctly and still produce unusable
family links. Capacitor's `https://localhost/` is private to the installed app; exercise the
sender's native context and assert the recipient gets a public web URL with the encrypted
payload solely in the fragment. Web senders retain their current deployment path.
Likewise, Android backup exclusions must resolve to the directory that actually stores the
WebView data. `root/app_webview` and `file/app_webview` refer to different trees. Resolve the
domain and path against representative localStorage and IndexedDB files in a regression test;
seeing an `<exclude>` element alone proves nothing. Register any source XML read by a unit test as a Gradle test input: a changed XML
file can otherwise leave test results UP-TO-DATE and let a mutation survive without executing
the test. Device backup/restore still needs native validation. See `share.test.ts` and `android/app/src/test/.../BackupRulesTest.java` in elder-care-planner.

> Relocated from `.agents/AGENTS.md` §6 as part of the rulebook slim-down — see [`docs/SLIM_RULEBOOK_PROPOSAL.md`](../../docs/SLIM_RULEBOOK_PROPOSAL.md). This file is the canonical text; the rulebook itself carries only the one-line index entry below.

- **Test the Artifact You Ship, at Every Origin It Ships To**: A Playwright suite pointed only at the dev server proves nothing about the production bundle — the dev server rewrites away exactly the deploy-specific configuration (`base`, asset URLs, minified chunk names) that breaks a real deployment. An app that ships to more than one origin needs a smoke test that loads the **built** output at **each** origin, and asserts on failed requests (`response.status() >= 400`), not just on rendered text. Serve each origin on its **own port**: one server answering several mounts will resolve an asset URL pinned to the wrong origin and pass on an app that is broken in production. Prove such a test works by mutation — reintroduce the bug and confirm the test actually fails — because a smoke test that silently passes on a broken build is worse than none. See `projects/mood-diner/e2e/production-bundle.spec.ts`. This is now mechanically sensed: `senseProductionBundleTest` reports any app whose Playwright `webServer` entries only ever run a dev server, and `scripts/serve-dist.mjs` is the shared server so adopting it is a config line rather than new code. The stand-in server must **resolve URLs the way the real host does** — GitHub Pages serves `/recipes` from `recipes.html`, and a Next.js static export prefetches exactly those extensionless paths, so a server that only tried the literal path reported four 404s the live site never produces. A smoke test that cries wolf gets muted, which is worse than not having one; but resolve only the *requested* path, never a blanket SPA fallback to the root `index.html`, or a misrouted asset URL silently returns HTML and the test passes on a broken build.
