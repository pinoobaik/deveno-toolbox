# Dev Toolbox

A collection of small, focused utilities for everyday development work. Everything runs
client-side in the browser: no backend, no database, no API, and no data ever leaves the page.

The goal for this version is a solid foundation rather than a long feature list: a
consistent app shell, routing, a reusable component set, and nine working tools grouped into
six categories.

## Features

- **JSON Formatter** - pretty print, minify, sort keys, validate. Invalid input reports a
  readable reason plus the line and column of the failure when the engine reports a position.
  Input is capped at 1,000,000 characters and 256 levels of nesting.
- **UUID Generator** - generate 1-20 v4 UUIDs from `crypto.randomUUID()`, copy individually
  or all at once. The amount field only accepts a plain whole number in range.
- **Timestamp Converter** - convert Unix timestamps (seconds or milliseconds) to dates and
  back, showing Unix seconds, Unix milliseconds, local time, and UTC. A date-only ISO value
  such as `2024-01-15` is read as UTC midnight, matching the ECMAScript definition; a date and
  time without a zone is read as local time and says so.
- **Base64 Encoder & Decoder** - encode text to standard Base64 and decode Base64 back to
  UTF-8 text. Bad input is separated into three reported cases: characters outside the Base64
  alphabet, `=` padding that does not line up with the end, and a truncated group of one
  character. Bytes that are not valid UTF-8 are reported as non-text rather than quietly
  turning into replacement characters, because this tool converts text and not binary files.
  Input is capped at 500,000 characters and encoding runs in 32,768-byte chunks so a large
  string never builds one oversized temporary. Standard Base64 only: base64url is not
  accepted here.
- **URL Encoder** - percent-encode and decode URI text, either as a whole URI or as a single
  component, which is what a query value needs. A `%` not followed by two hex digits is
  reported with its 1-based position, a valid escape whose bytes are not UTF-8 is reported as
  undecodable, and a lone surrogate is refused rather than written out as a replacement
  character. The tool percent-encodes only; it does not parse, validate, resolve, or fetch
  anything.
- **JWT Decoder** - read the header and payload of a JSON Web Token and pretty print both.
  Each of the three segments must be base64url that decodes to a JSON object, so an array or
  a bare string in the header is refused. The signature segment is returned exactly as
  received and is never decoded or verified: a forged token decodes just like a valid one, and
  the page says so in a standing warning rather than only in the success case. Tokens are
  capped at 8,192 characters and no failure message ever quotes the token.
- **Text Case Converter** - lowercase, UPPERCASE, Title Case, and Sentence case. Title
  lowercases first and then capitalizes the first letter after each run of whitespace;
  Sentence capitalizes after `.`, `!`, or `?` only when whitespace follows, so `e.g. this`
  stays intact. Both are idempotent, and an unpaired surrogate in the input becomes `U+FFFD`.
- **SHA Hash Generator** - SHA-1, SHA-256, SHA-384, and SHA-512 digests of any text through
  `crypto.subtle.digest`, always encoding the input as UTF-8. Hashing is an explicit button
  press rather than a per-keystroke effect, the algorithm is chosen before the request runs,
  and a missing secure context is reported as a fixed message instead of throwing.
- **Number Base Converter** - integers between binary, octal, decimal, and hexadecimal on
  `BigInt`, so values far beyond `2^53` stay exact in both directions. A digit that does not
  belong to the selected base is reported with its position; a sign or a base prefix on its
  own is not accepted as input.

Shared behaviour:

- Dark, responsive layout with a sticky sidebar on desktop and a drawer on mobile. The mobile
  drawer is a modal dialog: focus moves into it, is trapped while open, and returns to the
  trigger on close.
- Client-side routing, so tools are lazy loaded and each tool has its own URL. Each route sets
  its own `document.title`.
- The home page searches the catalog by name, description, and keyword. Distinct terms are
  scored, summed, and ranked with ties resolved by catalog order; clearing the search restores
  the full catalog.
- The sidebar groups tools by category, and every category with tools has its own page at
  `/category/:categoryId`. An unknown category id renders the shared not found page, while a
  known id with no tools renders a real page with an empty state.
- Favorites and recently used tools are remembered in `localStorage`. Only tool ids and
  timestamps are stored, never tool content, and a storage failure degrades to a preference
  that does not survive a reload rather than to an error.
- Every tool page carries a Home / Category / Tool breadcrumb and a related-tools list at the
  foot, both derived from the catalog rather than written out by hand.
- Copy-to-clipboard with inline success and failure feedback.
- Keyboard accessible with visible focus states, labelled inputs, and status messages that
  pair an icon and text label with colour.
- A render error in any tool is caught by an error boundary that keeps the shell usable and
  offers a retry.

## Tech stack

| Purpose | Choice |
| --- | --- |
| UI library | React 19 |
| Build tool | Vite 7 |
| Language | TypeScript 5 (strict) |
| Styling | Tailwind CSS 4 |
| Icons | lucide-react |
| Routing | React Router 7 |
| Tests | Vitest 5 |

State is plain React state and hooks. There is no state management library, and JSON/UUID
work uses native `JSON.parse`, `JSON.stringify`, and `crypto.randomUUID()`.

## Installation

Requires Node.js 20.19+ or 22.12+.

```bash
npm install
```

## Development

```bash
npm run dev
```

Vite starts the dev server with hot module replacement, usually at
<http://localhost:5173>.

Other scripts:

```bash
npm run build      # type-check with tsc -b, then build to dist/
npm run preview    # serve the production build locally
npm run typecheck  # type-check only
npm run test       # run the logic tests once
npm run test:watch # run the logic tests in watch mode
```

## Tests

```bash
npm run test
```

Vitest covers the pure `logic.ts` layer of each tool, plus the shared registry, category,
search, breadcrumb, related-tool, and storage modules, which is where the parsing, conversion,
ranking, selection, and normalization rules live. Component behaviour is exercised through
those functions rather than through DOM-level tests: the Vitest environment is `node`, so
rendering a component is not supported yet. The storage boundary is injectable, so
`storage.test.ts` simulates unavailable storage and throwing
`getItem`/`setItem`/`removeItem` without a DOM. Test files sit next to the code they cover:
every tool has its own `logic.test.ts`, and the shared modules carry `registry.test.ts`,
`categories.test.ts`, `search.test.ts`, `breadcrumbs.test.ts`, `related.test.ts`, and
`storage.test.ts`. The SHA tool is the one piece of asynchronous I/O in the catalog, so its
tests temporarily replace `globalThis.crypto` with a stub that is missing or that rejects,
which runs both the unavailable branch and the failure branch without a browser.

## Build

```bash
npm run build
npm run preview
```

`npm run build` runs `tsc -b` first, so a TypeScript error fails the build. Output lands in
`dist/`.

Because the app uses client-side routing, a static host must rewrite unknown paths to
`index.html` so deep links like `/tools/json-formatter` resolve.

## Project structure

```text
dev-toolbox/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── layout/        # AppLayout, AppErrorBoundary, Header, Sidebar, MobileNav
│   │   ├── tools/         # CategoryNav, RelatedTools, ToolCard, ToolLayout
│   │   └── ui/            # Breadcrumbs, Button, Card, CopyButton, EmptyState, IconButton,
│   │                     # SegmentedControl, Select, StatusMessage, TextArea, TextField
│   ├── pages/             # HomePage, CategoryPage, ToolPage, NotFoundPage
│   ├── tools/             # one folder per tool + the shared registry
│   │   ├── registry.ts
│   │   ├── registry.test.ts
│   │   ├── categories.ts
│   │   ├── categories.test.ts
│   │   ├── search.ts
│   │   ├── search.test.ts
│   │   ├── breadcrumbs.ts
│   │   ├── breadcrumbs.test.ts
│   │   ├── related.ts
│   │   ├── related.test.ts
│   │   ├── json-formatter/
│   │   │   ├── JsonFormatter.tsx
│   │   │   ├── logic.ts
│   │   │   ├── logic.test.ts
│   │   │   └── types.ts
│   │   ├── uuid-generator/
│   │   │   ├── UuidGenerator.tsx
│   │   │   ├── logic.ts
│   │   │   ├── logic.test.ts
│   │   │   └── types.ts
│   │   ├── timestamp-converter/
│   │   │   ├── TimestampConverter.tsx
│   │   │   ├── logic.ts
│   │   │   ├── logic.test.ts
│   │   │   └── types.ts
│   │   ├── base64/
│   │   │   ├── Base64Tool.tsx
│   │   │   ├── logic.ts
│   │   │   ├── logic.test.ts
│   │   │   └── types.ts
│   │   ├── url-encoder/
│   │   │   ├── UrlEncoder.tsx
│   │   │   ├── logic.ts
│   │   │   ├── logic.test.ts
│   │   │   └── types.ts
│   │   ├── jwt-decoder/
│   │   │   ├── JwtDecoder.tsx
│   │   │   ├── logic.ts
│   │   │   ├── logic.test.ts
│   │   │   └── types.ts
│   │   ├── text-case/
│   │   │   ├── TextCase.tsx
│   │   │   ├── logic.ts
│   │   │   ├── logic.test.ts
│   │   │   └── types.ts
│   │   ├── sha-digest/
│   │   │   ├── ShaDigest.tsx
│   │   │   ├── logic.ts
│   │   │   ├── logic.test.ts
│   │   │   └── types.ts
│   │   └── number-base/
│   │       ├── NumberBaseTool.tsx
│   │       ├── logic.ts
│   │       ├── logic.test.ts
│   │       └── types.ts
│   ├── lib/               # shared helpers: cn, clipboard, text metrics, title hook,
│   │                      # storage, useToolPreferences
│   ├── types/             # ToolDefinition, ToolCategoryId, ToolComponentProps, StatusTone
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── .gitignore
├── README.md
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts
└── vitest.config.ts
```

### How a tool is organised

Each tool folder keeps presentation and logic apart:

- `XxxTool.tsx` (named after the tool, for example `JwtDecoder.tsx`) - the component, holding
  only local UI state, and the default export the lazy import expects.
- `logic.ts` - pure functions. They never throw; they return a result object so the UI can
  render an error instead of crashing.
- `types.ts` - the types for that tool, plus its result shapes and its documented input limit.

Error messages never embed the submitted document. JSON and date inputs are echoed back only
as a short, length capped fragment, and a `JSON.parse` failure is reduced to a fixed reason
plus a position, so neither raw engine wording nor file contents reach the screen. The newer
tools go further: every failure message is a fixed string that names only which segment,
position, or base failed, so Base64 input, URL text, case-converted text, number input, and
JWT content are never quoted back at all. Engine exceptions (`atob`, `JSON.parse`,
`crypto.subtle`) are caught and mapped to those same fixed messages.

Five of the six new tools recompute inside a `useMemo` keyed on their input, so they stay live
without an effect, a subscription, or a debounce. The SHA tool is the exception:
`crypto.subtle.digest` returns a promise, so it hashes on an explicit button press. Only SHA
touches an API at all; every other tool is a pure string transformation, nothing is written to
storage, and no network request is made by any of them.

`src/tools/registry.ts` is the single source of truth for navigation, routing, and the tool
index. Adding a tool means creating the folder, adding one entry to `tools`, and the sidebar,
routes, and home page pick it up automatically.

```ts
{
  id: 'json-formatter',
  name: 'JSON Formatter',
  description: 'Format, minify and validate JSON with clear error messages.',
  icon: Braces,
  category: 'data',
  keywords: ['json', 'format', 'pretty print', 'minify', 'validate', 'sort keys'],
  component: lazy(() => import('./json-formatter/JsonFormatter')),
}
```

`src/tools/categories.ts` holds the category metadata: the label, description, icon, and display
order for each of the six categories. Category identity lives in the `ToolCategoryId` union in
`src/types/tool.ts`, so adding a category id forces a matching descriptor instead of leaving a
category unlabelled. Pages and navigation read labels and ordering from `TOOL_CATEGORIES` rather
than restating them.

`src/tools/search.ts` is the pure search layer behind the home page. It normalizes the query,
splits it into at most eight distinct terms, scores each term against a tool's name, keywords,
and description, drops tools that match nothing, and breaks score ties using catalog order. It
takes the catalog as an argument and never mutates it, so it stays testable without a DOM.

Registry, category, search, breadcrumb, and related-tool invariants are covered by
`registry.test.ts`, `categories.test.ts`, `search.test.ts`, `breadcrumbs.test.ts`, and
`related.test.ts`: unique kebab-case ids, at least one lowercase keyword per tool, every
category backed by a descriptor, empty categories excluded from the UI, search ranking that is
deterministic and case insensitive, breadcrumb labels that always come from catalog metadata,
and related-tool picks that exclude the current tool and never depend on sort stability.

### Tool layout and navigation

`src/components/tools/ToolLayout.tsx` is the shared shell every tool renders inside. Its order
is breadcrumb, identity header, primary actions, the tool's own content, then related tools.
Every part except the content is optional in practice: a tool with no toolbar, a category
without a descriptor, or a catalog with nothing to relate to simply renders less. There is no
prop matrix, no render callback, and no context -- a tool is described by its `ToolDefinition`
and nothing else, so the layout stays independent of any individual tool.

The header exposes the name, the description, a link back to the tool's category, and the
favorite control. The favorite is the single Phase 3 preference implementation: `aria-pressed`,
a label that flips with state, focus from the shared `:focus-visible` rule, and no direct
`localStorage` access anywhere in the component.

Breadcrumbs live in `src/components/ui/Breadcrumbs.tsx` as an ordered list inside a `nav`
labelled `Breadcrumb`. `src/tools/breadcrumbs.ts` builds the trail from `findTool` and
`findCategory`, so no category name is repeated in the UI and a category that is missing its
descriptor drops that step instead of throwing; an unregistered id returns an empty trail,
which renders nothing. The final step carries no destination, so it is plain text with
`aria-current="page"` rather than a link back to the current page.

Related tools are picked by `src/tools/related.ts`, which takes the catalog as an argument and
ranks it by same category first, then keyword overlap, then catalog order. That ordering is
explicitly tie-broken rather than left to sort stability, so the result is the same on every
run. The current tool is excluded, an unknown id returns nothing, and the default limit is
three. `src/components/tools/RelatedTools.tsx` renders the list with the existing `ToolCard`
and returns `null` when there is nothing to suggest, so the slot never produces an empty
container. Relationships are derived, never hardcoded: a new tool joins the ranking by being
added to the registry.

### Preferences and persistence

`src/lib/storage.ts` is the only module that touches `localStorage`. It is React free, and it
states the hard content boundary for the whole project: **persistence stores tool references,
not tool content.** Nothing a user types into a tool, and nothing a tool produces, may reach
storage. That applies to every current and future tool.

| | |
| --- | --- |
| Storage key | `dev-toolbox:preferences` (defined once in `storage.ts`) |
| Schema version | `1` -- the initial schema, so no migration exists yet |
| Payload | `{ version, favorites: string[], recents: [{ id, timestamp }] }` |
| Maximum favorites | 20 |
| Maximum recents | 10 |

Reads are two-tiered. A blob-level problem -- bad JSON, a non-object root, a missing or
unsupported version, a field that is not an array -- discards the payload and returns
defaults. An item-level problem -- a non-string id, an id the registry does not know, a
duplicate, an out-of-range timestamp -- drops only that item. Recents are de-duplicated
keeping the newest use, re-sorted MRU-first with an explicit tie-break, and capped. Timestamps
must be finite, non-negative, and no more than 24 hours ahead of now.

Writes swallow every storage exception and report `false`; the in-memory value stays
authoritative, so quota limits, privacy restrictions, and blocked storage degrade to a
preference that does not survive a reload. Browser exception messages are never shown.

`src/lib/useToolPreferences.ts` exposes the state through `useSyncExternalStore`, backed by a
single module-level copy shared by every subscriber. Reads happen once per page load and
writes once per actual preference change -- never per render. Valid ids are derived from the
registry rather than duplicated here, so storage holds no copy of the catalog and a removed
tool stops validating the moment the registry changes; unknown ids are dropped on read and
cleared from storage on the next write.

The favorite control lives in the shared tool header, and opening a tool is what records it as
recent. Both carry only the tool id.

## Roadmap

- [x] Project setup
- [x] JSON Formatter
- [x] UUID Generator
- [x] Timestamp Converter
- [x] Logic test suite (Vitest)
- [x] Base64 Encoder / Decoder
- [x] URL Encoder / Decoder
- [x] JWT Decoder
- [x] Text Case Converter
- [x] Hash Generator
- [x] Number Base Converter
- [ ] Regex Tester
- [ ] URL Parser
- [ ] Color Converter
- [ ] Password Generator
- [ ] Cron Expression Parser
- [ ] HTML Entities
- [ ] Markdown Preview

## Conventions

- Strict TypeScript, no `any`.
- Business logic lives in `logic.ts` or `src/lib`, never inside a component.
- Accessibility: every control is labelled, focus is visible, and status is never conveyed by
  colour alone.
- No authentication, backend, database, or server API.
