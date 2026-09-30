# Dev Toolbox

A collection of small, focused utilities for everyday development work. Everything runs
client-side in the browser: no backend, no database, no API, and no data ever leaves the page.

The goal for this first version is a solid foundation rather than a long feature list: a
consistent app shell, routing, a reusable component set, and three working tools.

## Features

- **JSON Formatter** - pretty print, minify, sort keys, validate. Invalid input reports a
  readable reason plus the line and column of the failure.
- **UUID Generator** - generate 1-20 v4 UUIDs from `crypto.randomUUID()`, copy individually
  or all at once.
- **Timestamp Converter** - convert Unix timestamps (seconds or milliseconds) to dates and
  back, showing Unix seconds, Unix milliseconds, local time, and UTC.

Shared behaviour:

- Dark, responsive layout with a sticky sidebar on desktop and a drawer on mobile.
- Client-side routing, so tools are lazy loaded and each tool has its own URL.
- Copy-to-clipboard with inline success and failure feedback.
- Keyboard accessible with visible focus states, labelled inputs, and status messages that
  pair an icon and text label with colour.

## Tech stack

| Purpose | Choice |
| --- | --- |
| UI library | React 19 |
| Build tool | Vite 7 |
| Language | TypeScript 5 (strict) |
| Styling | Tailwind CSS 4 |
| Icons | lucide-react |
| Routing | React Router 7 |

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
```

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
│   │   ├── layout/        # AppLayout, Header, Sidebar, MobileNav
│   │   ├── tools/         # ToolCard, ToolLayout
│   │   └── ui/            # Button, Card, CopyButton, EmptyState, StatusMessage,
│   │                     # TextArea, TextField
│   ├── pages/             # HomePage, ToolPage, NotFoundPage
│   ├── tools/             # one folder per tool + the shared registry
│   │   ├── registry.ts
│   │   ├── json-formatter/
│   │   │   ├── JsonFormatter.tsx
│   │   │   ├── logic.ts
│   │   │   └── types.ts
│   │   ├── uuid-generator/
│   │   │   ├── UuidGenerator.tsx
│   │   │   ├── logic.ts
│   │   │   └── types.ts
│   │   └── timestamp-converter/
│   │       ├── TimestampConverter.tsx
│   │       ├── logic.ts
│   │       └── types.ts
│   ├── lib/               # shared helpers: cn, clipboard, text metrics, constants
│   ├── types/             # ToolDefinition, ToolComponentProps, StatusTone
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── .gitignore
├── README.md
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
└── vite.config.ts
```

### How a tool is organised

Each tool folder keeps presentation and logic apart:

- `XxxTool.tsx` - the component, holding only local UI state.
- `logic.ts` - pure functions. They never throw; they return a result object so the UI can
  render an error instead of crashing.
- `types.ts` - the types for that tool, plus its result shapes.

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
