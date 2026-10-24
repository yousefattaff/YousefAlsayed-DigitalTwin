# Repository instructions

## Architecture and source ownership

- `frontend/` is Next.js 16 App Router, React 19, TypeScript, and Tailwind CSS v4. `app/page.tsx` loads content; `components/HomeClient.tsx` composes the portfolio.
- Native `app/api/chat/route.ts` and `app/api/health/route.ts` use the Node.js runtime and share `lib/twin.ts`. Vercel serves both the site and API.
- Root `content/` is the canonical portfolio and Twin knowledge. `scripts/sync-content.mjs` copies Markdown and the three `backend/data/` persona files into self-contained frontend bundles.
- `backend/` is the optional FastAPI/Mangum service. Runtime modules are `server.py` and `lambda_handler.py`; `deploy.py` packages the existing Lambda.
- `backend/terraform/` contains AWS provider/variable definitions and remote-state bootstrap. Application Lambda/API Gateway infrastructure is not provisioned by the current Terraform code.
- The live domain is `https://yousefalsayed.me`. Read `DEPLOYMENT_PLAN.md` before deployment and `docs/RELEASE_REVIEW.md` for verification limits.

## Immutable contracts

1. Preserve section IDs `about`, `skills`, `projects`, `achievements`, `terminal`, `contact`, and `twin`.
2. Keep keys in ignored environment files or cloud secrets. Only `.env.example` is a public template. Never display credentials or prefix a secret with `NEXT_PUBLIC_`.
3. Preserve native chat `message`, bounded `history`, `session_id`, `topic`, and response/source compatibility. Clearing chat cancels pending work; stale replies must not repopulate it.
4. Use server-only Groq inference with `openai/gpt-oss-120b` and supported `openai/gpt-oss-20b` fallback. Keep bounded input/provider responses, cancellation, the shared 25-second provider deadline, and safe errors.
5. Preserve native Next.js output and same-origin API routing. Static export or a legacy upstream `/api` rewrite would remove or bypass the native functions.
6. Select external endpoints only with an explicit `NEXT_PUBLIC_DEPLOY_TARGET=aws`. Production endpoints require HTTPS non-loopback hosts without credentials, query strings, or fragments. Rebuild when changing public routing variables.
7. Ground claims in canonical documents and synchronized persona. LinkedIn provenance is `backend/data/linkedin.pdf`. Keep the ROS1 graduation project distinct from the separate ROS2 project.

## Implementation

Read `frontend/AGENTS.md` and the relevant installed Next.js guides under `frontend/node_modules/next/dist/docs/` before frontend changes. Use `@/*` imports; keep browser state in client components and credentials in server-only modules.

Reuse existing CSS tokens: obsidian canvas, frosted zinc panels, titanium text, emerald status, and current typography. Preserve reduced-motion behavior, gallery scrolling, unique media, explicit aspect ratios, and video posters. Remove unused code only after checking imports, dynamic references, CSS, and public media.

Local archives live under ignored `.local/`; conversations use `backend/.memory/` locally or configured Lambda/S3 storage. Package only runtime code and canonical knowledge, excluding local state and source archives.

## Verification and release

From `frontend/`:

```bash
npm ci --include=dev
npm test
npm run lint
npm run build
npm run release:check
```

From `backend/`:

```bash
uv sync --frozen --no-dev
uv run --frozen --no-dev python -m unittest discover -s tests
uv run --frozen --no-dev python -m py_compile server.py lambda_handler.py deploy.py
```

From the root, run `terraform -chdir=backend/terraform fmt -check -recursive`. Full validation requires initialized providers.

The user-run `.github/prepare-release.ps1` verifies, stages intended paths, scans the Git index, and creates the release commit. It does not push or deploy. Respect the session's managed filesystem/network restrictions when performing Git or cloud operations; record limitations accurately.

Local preflight is `npm run deploy:check -- --site=https://yousefalsayed.me`. The deploy helper validates the existing project/domain association, writes Production secrets via stdin, verifies a candidate, and promotes only after those checks. Mocked tests and configuration health do not establish real inference; verify production with chat and follow-up requests.
