# AGENTS.md

Guidance for coding agents (Cursor, Claude Code, others) working in this repository.

Recap AI is a Chrome MV3 extension built with WXT, React 19, TypeScript, Tailwind v4 + shadcn/ui and the Vercel AI SDK. It adds a panel to YouTube and to course lecture pages: summary, transcript, chat, diagrams and a tutor. Users bring their own provider key or sign in with a ChatGPT subscription. There is no backend.

This repo is a fork of `PaoloJN/recap` (the `upstream` remote). Open PRs against `tungdd97/recap` `main`. With `gh`, pass `--repo tungdd97/recap`, because the default target is the parent repo.

## Commands

```sh
pnpm install                       # also runs `wxt prepare` (generates .wxt/, which tsconfig extends)
pnpm dev                           # dev build with hot reload
pnpm build                         # production build -> .output/chrome-mv3 (Load unpacked from here)
pnpm test                          # vitest run (jsdom)
pnpm vitest run src/lib/storage.test.ts   # single file
pnpm vitest run -t "name of test"         # single test by name
pnpm check                         # Biome lint + format check; pnpm check:fix to apply
pnpm typecheck                     # wxt prepare && tsc --noEmit
pnpm verify:diagram                # headless Mermaid render check; needs local Chrome + ffmpeg
```

CI (`.github/workflows/ci.yml`) runs shellcheck on `scripts/macos/*.sh`, then `check`, `typecheck`, `test` and `build`. Run the same set before opening a PR.

## Shipping: every push to `main` is a release

`.github/workflows/release.yml` builds on each push to `main` and publishes GitHub release `v2.0.<run_number>` with `recap-chrome-mv3.zip` and `version.json`. The manifest version comes from the `RECAP_VERSION` env var (see `wxt.config.ts`). `package.json`'s `version` is not used, so don't bump it.

Installed copies pick up a release in two ways. The panel shows an update banner, because it polls GitHub at most every 6 hours (`src/lib/release/`). The macOS `recap-update` LaunchAgent also installs new releases daily (`scripts/macos/`). In short, merging to `main` ships to users.

## Architecture

Three runtimes communicate through typed messages. All message shapes live in `src/lib/port-protocol.ts`.

- **Background service worker** (`src/entrypoints/background.ts` → `src/background/`). This is the only place that holds keys or tokens and calls LLM providers.
  - `stream-handler.ts` listens on the port `yt-ai-stream`. It takes one `StreamRequest`, whose `kind` is `chat | summary | classify | diagram | concepts | quiz | author | grade`. It builds the prompt from `src/lib/prompts/` or `src/lib/tutor/` and runs `streamText`. It posts back `{type:"chunk", chunk: UIMessageChunk}`, then `done` or `error`. Disconnecting the port aborts the request. If a provider rejects the reasoning-effort or web-search options, it retries once without them and appends a note. It also records usage.
  - The ChatGPT-subscription provider skips the AI SDK. OAuth/PKCE, SSE and requests live in `src/lib/chatgpt/`, and the wiring in `src/background/chatgpt-*.ts`. Sign-in reads the loopback redirect through `webNavigation` and does not listen on a port.
  - `validate-key.ts` answers the `validate-key` runtime message by calling the provider's `/models` endpoint.
  - `site-access.ts` routes the `toggle-panel`, `explain-moment` and `focus-mode` commands and the toolbar click to the tab. If no content script answers, it requests the optional host permission, saves the origin in `grantedOrigins`, and injects the course script through `scripting`. The decision logic is in `src/lib/source/access.ts`.
- **Content scripts** (`src/entrypoints/youtube.content`, `course.content`). Both call `mountRecapPanel` (`src/lib/source/mount.tsx`), which mounts the React app (`src/components/shell/App.tsx`) in a WXT shadow-root UI. The stylesheet is inlined and only fonts are web-accessible. On YouTube the panel docks into `#secondary-inner`. Course sites get a floating drawer.
- **Diagram renderer** (`src/entrypoints/diagram-renderer/`). It is an extension page that the content script iframes so Mermaid can render outside the host page's CSP. The panel side is `src/lib/diagram/bridge.ts`, which queues renders and applies load and render timeouts. Messages are defined in `src/lib/diagram/protocol.ts`. An invalid Mermaid reply triggers one `diagram` request with `repair` set.

### Video sources

`src/lib/source/` defines a `VideoSource` adapter interface (`types.ts`) with these adapters:
- `youtube`, `udemy`, `coursera` and `dlai`, registered in `registry.ts` (most specific first)
- `generic`, an opt-in per origin that works on any HTML5 `<video>`

To support a new site, write an adapter, then add it to `registry.ts`, to `COURSE_MATCHES` and to the course content script's `matches`. If transcripts come from another host, also add it to `host_permissions` in `wxt.config.ts`. YouTube transcripts use YouTube's undocumented transcript endpoint (`src/lib/transcript/`). Fixtures for it are in `__fixtures__/`.

### State

Every persisted item is declared in `src/lib/storage.ts` as WXT `storage.defineItem("local:…")`, with a fallback and defaults. Don't call `chrome.storage` directly. Most stores are keyed per video: summaries, chats, diagrams, concepts and videoTypes. `apiKeys` and `chatgptSession` hold credentials and must never be sent to the page or logged. The React side reads items through `useStorageItem` and `useSettings`. If you change a stored shape, also handle data already saved in the old shape. `storage.ts` already does this, for example with `LEGACY_VIDEO_TYPE_PRESETS`.

## Conventions

- Biome sets 2-space indent, width 100, double quotes and no semicolons. It excludes `src/components/ui` (vendored shadcn), `docs/`, `__fixtures__` and Markdown.
- Import from `src/` through the `@/` alias.
- Tests sit next to the code as `*.test.ts(x)`. Background tests use `fakeBrowser` from `wxt/testing/fake-browser` (the `WxtVitest` plugin provides it) and `MockLanguageModelV3` from `ai/test`.
- This fork defaults the answer language to Tiếng Việt, and much of the UI copy and the README is Vietnamese. Match the language already used in the strings around your change.
- Comments explain why something is done, especially for permissions and manifest entries in `wxt.config.ts`. Keep that style.
- Record user-visible changes under `## Unreleased` in `CHANGELOG.md`.
- Design references: `docs/design/v3-handoff/` and `docs/superpowers/` (specs and plans).
