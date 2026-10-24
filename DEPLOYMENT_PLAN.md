# Deployment plan

The production portfolio is associated with **https://yousefalsayed.me** on Vercel with Namecheap DNS. The release source uses native Next.js 16 routes for the Digital Twin. Local release results and verification limits are recorded in [docs/RELEASE_REVIEW.md](docs/RELEASE_REVIEW.md).

## Production architecture

Vercel delivers the portfolio through its edge network. Chat and health execute as uncached **Node.js serverless functions**:

- `frontend/app/api/chat/route.ts` → `frontend/lib/twin.ts` → Groq.
- `frontend/app/api/health/route.ts` → server-key/model/knowledge configuration checks.
- Primary model: `openai/gpt-oss-120b`; supported fallback model: `openai/gpt-oss-20b`.
- One 25-second provider deadline; route `maxDuration` is 40 seconds.
- Native requests carry bounded `history`, an optional `session_id`, and a retrieval `topic`. Replies return `response`, `session_id`, `topic`, and `sources`.

Canonical Markdown from root `content/` and persona files from `backend/data/` are synchronized into `frontend/content/` and `frontend/data/twin/` before development/build. Deleted or renamed source Markdown is removed from the bundled copy after current documents have been copied successfully. `next.config.ts` includes both directories in `/api/*` file traces, so deployed functions have self-contained knowledge.

## Vercel project settings

Use **`frontend/` as the project root**. The checked-in `frontend/vercel.json` is:

```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "installCommand": "npm ci --include=dev",
  "outputDirectory": null
}
```

Keep the framework-default output so the native API functions are built. Remove obsolete static `out/` overrides and upstream `/api/:path*` rewrites from project settings when migrating an older deployment.

| Variable | Production value | Scope |
| --- | --- | --- |
| `NEXT_PUBLIC_DEPLOY_TARGET` | `vercel` | Public build-time routing choice |
| `GROQ_API_KEY` | Existing private Groq key | Server-only Production secret |
| `GROQ_MODEL` | `openai/gpt-oss-120b` | Server model |
| `GROQ_MODEL_FALLBACK` | `openai/gpt-oss-20b` | Server fallback model |
| `TWIN_PRODUCTION_URL` | `https://yousefalsayed.me` | Optional local helper target |
| `NEXT_PUBLIC_API_URL` | Inactive while target is `vercel` | Explicit external-mode endpoint |
| `NEXT_PUBLIC_API_URL_FALLBACK` | Inactive while target is `vercel` | Explicit external-mode fallback |

Keep keys in ignored local environment files or cloud secret settings. A local `.env.local` key is not automatically uploaded by a Git deployment. Configure the Production environment and redeploy when changing it. Public routing variables require a new frontend build.

The old endpoint `https://uvsk3twnk5.execute-api.eu-north-1.amazonaws.com` remains a historical, unverified AWS setting in the helper. It is inactive in Vercel mode and must be replaced with a verified endpoint before selecting AWS.

## Build and deploy

For a fresh clone, install the Vercel CLI if needed, authenticate, and link **the existing project serving the live domain** from `frontend/`:

```bash
npm install --global vercel
vercel login
vercel link
```

Select the existing production project rather than creating another one. The helper and local deployment preflight require the ignored `frontend/.vercel/project.json` link. The helper checks that link against the supplied site's project before remote changes.

From `frontend/`:

```bash
npm ci --include=dev
npm run dev:check
npm test
npm run lint
npm run build
npm run release:check
npm run deploy:check -- --site=https://yousefalsayed.me
```

The preflight is local: it validates configuration, knowledge traces, native routes, and browser-secret exclusion. It does not verify live inference or remote ownership.

With an authenticated Vercel CLI and access to Vercel and Groq:

```bash
npm run deploy:vercel -- --site=https://yousefalsayed.me
```

The deployment helper resolves the custom domain to its deployment/project/account and verifies domain attachment before changing settings. It clears obsolete static output settings, upserts Production environment variables using the existing local key, pulls settings, runs tests/lint, and builds using the Vercel CLI.

It deploys a candidate without assigning production domains, checks project identity, native routing, grounded replies, follow-up context, and media, then promotes the candidate and checks the public custom domain. Secret values travel through stdin and are redacted from reports.

Deployment and preflight reports are stored separately under ignored `frontend/.vercel/`. A successful release must include a production URL and passing live checks; a local build or preflight alone cannot establish deployment success.

## Post-deployment checks

1. Open `https://yousefalsayed.me` and confirm each public section: `about`, `skills`, `projects`, `achievements`, `terminal`, `contact`, and `twin`.
2. Request `/api/health`; require loaded knowledge, supported models, and `llm_configured: true`.
3. Ask the Twin about Arche Robotics, then ask a tools follow-up carrying the returned session/topic and conversation history.
4. Ask about the graduation project and check that it retains the verified ROS1/hardware context.
5. Check project/gallery assets, resume, video posters, and video byte-range delivery.

Health reports configuration without calling the provider. Real chat requests are needed to establish inference availability. A `502 DNS_HOSTNAME_NOT_FOUND` on the API can indicate an obsolete upstream rewrite; review the deployment's routing and output settings before changing DNS.

## Namecheap custom domain

The requested Advanced DNS records are:

| Type | Host | Value | TTL |
| --- | --- | --- | --- |
| A | `@` | `76.76.21.21` | Automatic |
| CNAME | `www` | `cname.vercel-dns.com` | Automatic |

Attach both hostnames to the correct Vercel project and confirm Vercel's current domain recommendations, valid configuration, and certificate. DNS records can remain unchanged when repairing application routing.

## Optional AWS backup

Infrastructure files now live in **`backend/terraform/`**. The bootstrap provisions an S3 Terraform state bucket and DynamoDB lock table. The current Terraform code does not provision the portfolio's Lambda/API Gateway application.

```bash
terraform -chdir=backend/terraform fmt -check -recursive
terraform -chdir=backend/terraform init -backend=false
terraform -chdir=backend/terraform validate
terraform -chdir=backend/terraform/bootstrap init -backend=false
terraform -chdir=backend/terraform/bootstrap validate
```

Provider initialization needs registry access. Run application deployment only against an existing, verified Lambda/API Gateway setup. The manually triggered `.github/workflows/deploy-aws.yml` packages current runtime modules and canonical Markdown, updates `twin-api` in `eu-north-1`, and verifies configured health.

CI and local packaging both use `backend/deploy.py`. It exports the frozen `uv.lock`, installs hash-verified Linux x86_64 wheels for Python 3.12, excludes environment files, and rejects archives above Lambda's 50 MiB direct-upload limit. The workflow verifies the existing Lambda's Python 3.12/x86_64 configuration before packaging. To prepare the same archive locally, run `uv run --frozen --no-dev python deploy.py` from `backend/`; the generated package, archive, and dependency export remain ignored. A larger archive requires S3 delivery before deployment.

Repository secrets for that workflow are `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and a verified `API_GATEWAY_URL`. Configure the Lambda's own `GROQ_API_KEY`, allowed frontend origin, and local/S3 storage separately. The Node.js Twin and Python backend have independent storage and runtime contracts.

After checking a real external `/chat` reply, set `NEXT_PUBLIC_DEPLOY_TARGET=aws` and the verified endpoint(s), then rebuild/redeploy the frontend. This is an explicit deployment switch; native Groq failures do not automatically route traffic to AWS.

## Release handoff

From the root, run `& .\.github\prepare-release.ps1` in PowerShell. The helper verifies frontend/backend code and Terraform formatting, stages intended project paths, checks the staged index for credentials/artifacts, and creates:

```text
feat: complete architecture polish, code simplification, and production release documentation
```

Then inspect `git status` and run `git push origin main`. The helper does not push or deploy.
