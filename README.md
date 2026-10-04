# Dev Toolbox

A collection of small, focused utilities for everyday development work. Everything runs
client-side in the browser: no backend, no database, no API, and no data ever leaves the page.

The goal for this first version is a solid foundation rather than a long feature list: a
consistent app shell, routing, a reusable component set, and three working tools.

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

Shared behaviour:

- Dark, responsive layout with a sticky sidebar on desktop and a drawer on mobile. The mobile
  drawer is a modal dialog: focus moves into it, is trapped while open, and returns to the
  trigger on close.
- Client-side routing, so tools are lazy loaded and each tool has its own URL. Each route sets
  its own `document.title`.
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

Vitest covers the pure `logic.ts` layer of each tool, which is where the parsing and
conversion rules live. Component behaviour is exercised through those functions rather than
through DOM-level tests. Test files sit next to the code they cover, as `logic.test.ts`.

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
│   │   ├── tools/         # ToolCard, ToolLayout
│   │   └── ui/            # Button, Card, CopyButton, EmptyState, StatusMessage,
│   │                     # TextArea, TextField
│   ├── pages/             # HomePage, ToolPage, NotFoundPage
│   ├── tools/             # one folder per tool + the shared registry
│   │   ├── registry.ts
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
│   │   └── timestamp-converter/
│   │       ├── TimestampConverter.tsx
│   │       ├── logic.ts
│   │       ├── logic.test.ts
│   │       └── types.ts
│   ├── lib/               # shared helpers: cn, clipboard, text metrics, title hook
│   ├── types/             # ToolDefinition, ToolCategory, ToolComponentProps, StatusTone
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

- `XxxTool.tsx` - the component, holding only local UI state.
- `logic.ts` - pure functions. They never throw; they return a result object so the UI can
  render an error instead of crashing.
- `types.ts` - the types for that tool, plus its result shapes.

Error messages never embed the submitted document. JSON and date inputs are echoed back only
as a short, length capped fragment, and a `JSON.parse` failure is reduced to a fixed reason
plus a position, so neither raw engine wording nor file contents reach the screen.

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
  component: lazy(() => import('./json-formatter/JsonFormatter')),
}
```

## Roadmap

- [x] Project setup
- [x] JSON Formatter
- [x] UUID Generator
- [x] Timestamp Converter
- [x] Logic test suite (Vitest)
- [ ] Base64 Encoder / Decoder
- [ ] URL Encoder / Decoder
- [ ] JWT Decoder
- [ ] Regex Tester
- [ ] Color Converter
- [ ] Hash Generator
- [ ] Cron Expression Parser
- [ ] Markdown Preview

## Conventions

- Strict TypeScript, no `any`.
- Business logic lives in `logic.ts` or `src/lib`, never inside a component.
- Accessibility: every control is labelled, focus is visible, and status is never conveyed by
  colour alone.
- No authentication, backend, database, or server API.
