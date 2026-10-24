# Digital Twin frontend

Next.js 16 App Router, React 19, TypeScript, and Tailwind CSS v4 for [yousefalsayed.me](https://yousefalsayed.me). See the [root README](../README.md) for the architecture and the [deployment plan](../DEPLOYMENT_PLAN.md) for Vercel and AWS settings.

## Run locally

Requires Node.js 20.9+. From this directory:

```bash
npm ci --include=dev
cp .env.example .env.local
```

Use `Copy-Item .env.example .env.local` on PowerShell. Set the server-only `GROQ_API_KEY` in `.env.local`, leave `NEXT_PUBLIC_DEPLOY_TARGET=vercel`, then run:

```bash
npm run dev
```

The launcher validates configuration and starts or reuses Next.js at [localhost:3000](http://localhost:3000). `npm run dev:check` performs the local configuration check; `npm run dev:frontend` starts Next directly. Use `npm run dev -- --port 3001` for another port.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run sync:content` | Synchronize canonical knowledge and prune stale bundled Markdown |
| `npm test` | Chat, Markdown, Twin, deployment, and release regressions |
| `npm run lint` | ESLint for source and scripts |
| `npm run build` | Synchronize knowledge and create the production build |
| `npm run release:check` | Offline secret, index, routing, knowledge, ID, and asset checks |
| `npm run start` | Serve the production build locally |
| `npm run deploy:check -- --site=https://yousefalsayed.me` | Local deployment preflight |
| `npm run deploy:vercel -- --site=https://yousefalsayed.me` | Verified-project candidate deployment and promotion |

## Runtime contracts

`app/api/chat/route.ts` and `app/api/health/route.ts` execute in the Node.js runtime and share `lib/twin.ts`. The default browser API is same-origin. Public API endpoint variables become active only with an explicit `aws` target.

Knowledge sources are root `content/` and `backend/data/{facts.json,summary.txt,style.txt}`. `predev` and `prebuild` synchronize copies into `content/` and `data/twin/`; removed or renamed source Markdown is pruned from the bundled copy after successful synchronization. Both API functions trace this knowledge into their deployment bundles. A standalone frontend upload retains its existing synchronized copies when the root sources are absent.

Keep the section IDs `about`, `skills`, `projects`, `achievements`, `terminal`, `contact`, and `twin` stable. Keep media proportions/posters defined, reuse the CSS tokens in `app/styles/`, and keep credentials out of browser code. Only `.env.example` is tracked; all other environment files, `.next/`, `node_modules/`, `.vercel/`, and `.local/` are ignored.
