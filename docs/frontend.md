# SlopScanning Frontend Client Specification

**Author:** thanos · **Repository:** [beginningofcoding/slopscanning](https://github.com/beginningofcoding/slopscanning)

This document provides a comprehensive technical overview and reference for the frontend client of **SlopScanning**, built using Next.js 15, React 19, Tailwind CSS v4, and Lucide Icons.

---

## 📖 Architecture Overview

The SlopScanning client is designed as a **modern Single Page Dashboard (SPA)** nested inside Next.js routing routes. It handles real-time Server-Sent Events (SSE) connections using native Web Streams to render immediate feedback of backend quality-scans.

### Core Architecture Principles
1. **Next.js App Router**: Leverages file-system based routing under the `src/app` directory. Dynamic parameters (e.g. `[owner]`, `[name]`, `[prNumber]`) organize repository profiles.
2. **React 19 Server vs Client Division**: Page loaders and navigation elements use Server Components to fetch initial metadata, while complex analysis modules are declared as `'use client'` interactive interfaces.
3. **SSE Direct Consumer Model**: Uses a custom React stream decoding hook to parse chunked event packets over a single HTTP connection, completely bypassing WebSocket socket-pools.
4. **Tailwind CSS v4 styling system**: Driven by custom dark-theme tokens declared inside `@theme` parameters. Styling avoids inline wrappers, using HSL-tailored variables to keep layouts aligned and cohesive.

---

## 📂 Folder Structure

```
frontend/
├── public/                 # Favicons and assets
├── src/
│   ├── app/                # Route definitions & global stylesheets
│   │   ├── globals.css     # Global styles & Tailwind v4 theme variables
│   │   ├── layout.jsx      # HTML Layout and Google Sans Flex preconnects
│   │   ├── page.jsx        # Landing page with repo search box
│   │   └── repo/[owner]/[name]/
│   │       ├── page.jsx    # Repo Dashboard navigation
│   │       ├── prs/        # PR lists and details
│   │       ├── commits/    # Commit Verifier interface
│   │       ├── docs/       # Docs Verifier interface
│   │       └── scan/       # Code Scanner file explorer tree
│   ├── components/
│   │   ├── repo/           # RepoDashboard and Navigation headers
│   │   ├── pr/             # PRLists, Commit details, and Verdict panels
│   │   ├── commits/        # CommitVerifier component UI
│   │   ├── docs/           # DocsVerifier panel UI
│   │   ├── scanner/        # IDE-like CodeViewer and FileExplorer trees
│   │   └── ui/             # Badges, Cards, Spinners, and Progress Streams
│   ├── hooks/
│   │   └── useActionStream.js # Core hook consuming SSE text streams
│   └── lib/
│       ├── api.js          # Fetch wrappers for API endpoints
│       ├── constants.js    # Status code, label and color dictionaries
│       └── github.js       # GitHub URL parsing utilities
├── package.json            # Scripts and dependencies
└── tailwind.config.js      # Config (Bypassed in Tailwind v4)
```

---

## 🎨 Theme & Styling System

The application relies on Tailwind CSS v4, configured inside `src/app/globals.css` via `@theme` definitions:

### HSL-Tailored CSS Variable Palette
* **`--font-sans`**: `'Google Sans Flex'`, system-ui, sans-serif. Used for corporate headers, badges, and body content.
* **`--font-mono`**: `'Google Sans Mono'`, `'Fira Code'`, monospace. Enforced across file listings, code hunks, and log streams.
* **Backgrounds & Surfaces**:
  * `--color-bg`: `#0a0a0a` (Solid obsidian deep black)
  * `--color-surface`: `#111111` (Matte black cards)
  * `--color-surface-2`: `#1a1a1a` (Input backgrounds and borders)
  * `--color-border`: `#2a2a2a` (Standard divider line)
* **Status Colors & Dims**:
  * `--color-red`: `#ff4444` | `--color-red-dim`: `rgba(255,68,68,0.12)`
  * `--color-yellow`: `#ffcc00` | `--color-yellow-dim`: `rgba(255,204,0,0.12)`
  * `--color-green`: `#00cc88` | `--color-green-dim`: `rgba(0,204,136,0.12)`
  * `--color-blue`: `#4488ff` | `--color-blue-dim`: `rgba(68,136,255,0.12)`

### Performance Micro-Animations
* **`.animate-slide-in`**: Drives smooth upward translations when details complete:
  ```css
  @keyframes slide-in {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  ```
* **`.skeleton`**: Standard shimmer gradients for loading panels, avoiding blank pages during asynchronous API calls.

---

## 🔗 Custom React Hooks: useActionStream

The core client logic for rendering audits relies on **`useActionStream.js`**. It consumes the backend SSE stream in-flight, reading chunked byte arrays from a `fetch()` body reader.

### Code Mechanics & Stream Parser
```javascript
const reader = response.body.getReader();
const decoder = new TextDecoder('utf-8');
let buffer = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  buffer += decoder.decode(value, { stream: true });
  
  // Split chunks by double newline (SSE format)
  const parts = buffer.split('\n\n');
  buffer = parts.pop() || ''; // Keep the incomplete chunk in the buffer

  for (const part of parts) {
    if (part.startsWith('data: ')) {
      const dataStr = part.slice(6);
      try {
        const data = JSON.parse(dataStr);
        
        if (data.type === 'progress') {
          setEvents((prev) => [...prev, data]);
          if (data.percent === 100) setStatus('complete');
        } else if (data.type === 'result') {
          setResult({ data: data.data });
        } else if (data.type === 'error') {
          setError(data.message || 'Analysis failed');
          setStatus('error');
        }
      } catch (e) {
        console.error('Error parsing SSE JSON:', e);
      }
    }
  }
}
```

### Hook Outputs
* **`start(payload)`**: Resets internal states and dispatches the stream fetch POST request with custom configurations.
* **`abort()`**: Sends a cancel interrupt signal using `AbortController.abort()`, stopping CPU and network activity.
* **`status`**: State representation: `'idle' | 'streaming' | 'complete' | 'error'`.

---

## 🛠️ Feature UI Mapping

Each tool maps user interaction to explicit backend endpoints:

| Feature | UI Entrypoint Component | State Trigger | API Endpoint Called | Output Renders Component |
|---|---|---|---|---|
| **PR Reviewer** | `PRDetailClient.jsx` | "Review PR" Button | `POST /api/pr-review/analyze` | `PRReviewPanel.jsx` (Verdict & Proof details) |
| **Commit Verifier** | `CommitVerifierClient.jsx` | "Verify Commits" Button | `POST /api/commits/analyze` | Commits Table & Executive summary report |
| **Docs Verifier** | `DocsVerifierClient.jsx` | "Verify Docs" Button | `POST /api/docs/analyze` | Document tree accordion & Actionable fixes |
| **Code Scanner** | `CodeScannerClient.jsx` | "Start Scan" Button | `POST /api/code-review/analyze` | File Tree, CodeViewer highlights & Inspector drawers |

---

## 🔄 Client Data Flow

The following sequence details how the client routes and consumes repository audit statistics:

```
[Paste Repo URL on Home] ──► [Push Route /repo/[owner]/[name]]
                                        │
                                [Server Component]
                           [fetchRepoInfo() -> API Fetch]
                                        │
                                        ▼
                               [Render RepoDashboard]
                                        │
               ┌────────────────────────┼────────────────────────┐
               ▼                        ▼                        ▼
          [Click PRs]             [Click Docs]             [Click Scanner]
               │                        │                        │
       [fetchPRList()]          [DocsVerifierClient]     [CodeScannerClient]
               │                        │                        │
      [Render PR Details]         [Start SSE Stream]       [Start SSE Stream]
               │                  [/api/docs/analyze]    [/api/code-review/analyze]
       [Start SSE Stream]               │                        │
  [/api/pr-review/analyze]              ▼                        ▼
               │              [Render Fixes & Markdown]  [Render Explorer & Hilites]
               ▼
   [Render PRReviewPanel]
```

---

## 🛡️ Error & Edge Case Handling

1. **API Outage / Error Handlers**:
   The client-side fetching module wrapper `apiFetch` dynamically parses error codes. If the response reports an error, it extracts `body.detail` or `body.message` and raises a custom `ApiError`. Page boundaries catch this and output an `<ErrorState />` panel containing actionable troubleshooting tips.
2. **Aborting SSE Pipelines**:
   If the user navigates away from a page mid-scan, the component's `useEffect` cleanup hook automatically triggers `abort()`. This invokes the abort controller, stopping the browser's HTTP reader loop.
3. **Invalid Repositories URL Parse**:
   The parsing utility `lib/github.js` evaluates pasted urls before navigating. If the owner or name is missing, it sets an error validation flag under the search bar (*"Enter a valid GitHub repo URL"*), avoiding unnecessary server fetches.
