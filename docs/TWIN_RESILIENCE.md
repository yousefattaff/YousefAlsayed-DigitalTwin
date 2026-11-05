# Digital Twin resilience and prompt-led conversation

Policy 8 makes both the native Vercel Twin and optional Python service prompt-led. Technical requests, including code examples, Linux, SLAM and calculations, reach the model. Only targeted instruction overrides, role spoofing, prompt extraction and encoded attacks are blocked before inference. The canonical policy is [backend/guardrails.json](../backend/guardrails.json), synchronized into the frontend by the content script.

## Runtime contract

| Stage | Behavior |
| --- | --- |
| Input | Validate bounded JSON; inspect message, history and topic for actual instruction overrides and leaks. Injection receives an in-character 403 that the widget displays as ordinary assistant dialogue. Technical verbs and operating-system names are not attacks. |
| Local answers | Greetings and brief authored bilingual portfolio overviews consume no provider quota. These overviews remain available in the native Vercel service. |
| Scope | Scope patterns are hints for fallback wording, never pre-inference gates. The model handles casual off-topic questions with a brief, playful pivot. Missing details get an honest clarification. Neither is treated as a verified portfolio claim. |
| Retrieval | Send at most five exact snippets, totaling 2,800 quote characters. No duplicated persona or full retrieval envelope. DynamoDB and fleet questions prioritize the Arche Robotics record; LIDAR and Jetson questions prioritize physical graduation hardware. |
| Generation | One successful Groq generation with low reasoning effort, strict JSON, and a default cap of 1,024 completion tokens including reasoning. The native service may try its configured fallback model after a supported provider failure, within one 25-second deadline. No verification model call. |
| Structured reply | The decision is answer or insufficient_evidence. An answer needs distinct known passage IDs supporting its factual prose. An insufficient_evidence decision has no IDs and may contain a short conversational pivot or clarification. Malformed output is discarded. |
| Code | Requested examples tied to a documented project are allowed in fenced blocks, explicitly labeled illustrative. They are not represented as original production source and are never executed. Factual prose still needs evidence; example variable names and constants are not career facts. Secret, link and active-content checks inspect the entire answer, including code. |
| Validation | Check exact source containment, IDs, selected-source links, complete numeric literals, factual anchors and language. These checks do not prove semantic entailment. The Python service applies the same single-pass structure with its own local factual-anchor checks. |
| Recovery | Rejected drafts, missing evidence and Groq json_validate_failed responses return HTTP 200 dialogue with empty evidence. Native authored recovery can answer recognized tools and graduation questions from independent source text. Real authentication, network and timeout failures remain service errors. |
| Retry | The browser retries a 429 once after 1.2 seconds, or a longer Retry-After up to five seconds. Longer cooldowns return a gentle message immediately. Clearing/unmounting cancels backoff. A persistent rate limit does not fail over to another browser endpoint. |
| Memory | Social replies, redirects, rejected drafts and unsupported exchanges do not become portfolio context. The widget updates its topic only after accepted answers. Previous messages help resolve subjects locally and never enter generation. |

Grounding metadata covers the factual prose and its selected quotes, not execution or verification of illustrative code. Conversational pivots have grounding_verified false and empty sources/evidence. The model is responsible for its friendly style; fallback templates are only recovery text. The app never exposes provider diagnostics or credentials to visitors.

The smaller payload and single pass reduce token demand; they do not change Groq account limits or establish a guaranteed response time. Tests exercise five consecutive lean calls and safe retry/cancellation behavior. Actual latency and quota behavior require the live burst check described below.

## Prompt maintenance

Edit single_pass_instructions in the canonical policy. It defines first-person English/Egyptian Arabic conversation, grounded career facts, clearly labeled technical examples, warm off-topic pivots, and refusal to reveal private instructions or credentials. Supply the question, optional topic and evidence candidates as a separate user JSON message. Do not interpolate visitor content into system instructions or send conversation history as evidence.

Update canonical portfolio facts in content/, not in prompts. Keep the physical graduation robot separate from the linked repository simulation. Run content sync after policy/content edits. The duplicate instructions field is retained for older integrations; current services both read single_pass_instructions.

## Release validation

Run the frontend suite, backend unittest suite, lint, TypeScript, production build and release:check. The shared attack corpus includes English, Arabic, Unicode and encoded attacks alongside the exact DynamoDB script and LIDAR/Ubuntu false-positive regressions.

The live verifier now requires 38 checks on both a deployment candidate and the public domain. These include the reported age/override/work/history/projects/profile sequence (including the `histroy` typo), the prior refusal-to-projects sequence, bilingual profile facts, source quotes, targeted attack refusals, generated pizza pivots, an illustrative Python example, the LIDAR/Ubuntu question, and five questions completed within 30 seconds. The burst has no retries or pacing inside it; any 429/502 or missed deadline fails the check. Other inference checks are paced to avoid using up the account quota before the burst.

Provider preflight supports --case=career, tools, graduation, arabic, script, or robotics. It executes the current service without a Next.js build. Live checks use the actual HTTP API. Mocked tests establish code behavior and payload bounds only, not production throughput or deployment success.

## Skills and tools roadmap

These are proposed maintenance capabilities, not installed Codex skills or new dependencies.

| Priority / capability | Current foundation | Next deliverable and acceptance evidence |
| --- | --- | --- |
| P0: injection evaluation | Shared English/Arabic attack corpus and native tests, including encoded attacks, poisoned history/documents and structured hallucinations | Extend `backend/tests/guardrail_cases.json` and bilingual fixtures with indirect injection, confusables and false-positive examples. Run `npm --prefix frontend test` in CI. Track attack acceptance and legitimate-question refusal separately. Review relational hallucinations, not just unknown names. |
| P0: telemetry and quota control | JSON `twin_turn` events record model, provider calls, input characters, candidate count, prompt/completion tokens when supplied, limits, latency and validation outcome; `twin_error` records safe code/status | Aggregate Vercel logs into latency percentiles, token totals, 429 counts and fallback rate by language/model. Add a shared token budget/queue in Redis or an equivalent service only after measuring concurrent demand. Reserve completion budget, honor provider reset times and test parallel requests across instances. Do not rely on an in-memory bucket in serverless functions. |
| P1: retrieval and chunking | Local category/query ranking, five bounded excerpts, source and section metadata | Benchmark BM25 against current ranking on career, tools, graduation and Arabic queries. Add embeddings only when measured retrieval recall warrants the cost; precompute on content changes. Keep exact source spans and the same payload budget. |
| P1: session context | Bounded untrusted topic/history used only for retrieval | Replace free-text topic hints with validated canonical subject IDs (for example, `arche-robotics` or `r2-waiter`). Add expiry and consent before server-side persistence. Test pronouns, Arabic follow-ups, topic changes, forgery and clear-chat isolation. |
| P1: bilingual grounding quality | Factual-name checks and evidence-linked Arabic concept mappings | Build reviewed English/Arabic answer pairs and measure false refusals and unsupported claims. Consider curated bilingual claim records for facts that cannot safely be verified by deterministic checks. |

Never log visitor content, raw provider errors, hidden reasoning, API keys or authorization headers. Provider usage may be absent on failed requests; the current zero counters in that case are observed usage, not proof that the provider charged no tokens.

## Verification

Before a full rebuild/deployment, test the current server code against Groq from a normal network-enabled terminal:

```powershell
cd frontend
npm.cmd run verify:provider -- --case=tools
```

This reads the existing server key, synchronizes content, and runs the actual TypeScript Twin through the career question and tools follow-up. It verifies both answers against canonical evidence and carries the first reply's actual session, topic and conversation history into the follow-up. It does not deploy, change Vercel settings or require a Next.js build. Single-question cases are `career`, `graduation` and `arabic`; space separate runs when the provider is rate-limited. A report containing safe telemetry is written to ignored `.vercel/twin-provider-check.json`. No generated draft or secret is logged.

The local probe also reports rejected factual terms and whether the failure concerns language, scope or unsupported facts. This diagnostic hook runs only after secret, link and numeric checks; it is never enabled by HTTP request data and never adds those terms to API responses or production logs.

Require live provider and candidate checks before production promotion. Offline builds and local validation can still run when provider access is unavailable. Rejections report `fallback_reason` values such as `unsupported_claim`, `unsupported_number`, `truncated_completion`, `invalid_selection` and `model_missing_evidence`. These are API diagnostics, not visitor-facing text. The live checker stops immediately on a diagnosed validation failure; it retains bounded retries for actual 429s and legacy undiagnosed refusals.

```powershell
npm.cmd --prefix frontend test
backend\.venv\Scripts\python -m unittest discover -s backend/tests
npm.cmd --prefix frontend run lint
npm.cmd --prefix frontend run build
npm.cmd --prefix frontend run release:check
npm.cmd --prefix frontend run verify:twin -- --site=https://yousefalsayed.me
```

After deployment, require all 38 candidate and public-domain checks: policy 8, the exact refusal immediately followed by `projects`, approved profile facts and contact links, both overview languages, career and ROS2 graduation facts, a tools follow-up, and unsupported qualification/injection refusals. Inspect real token totals and latency alongside the UI. A live checker failure or blocked network is not a passing production result.

Local verification on November 3, 2026: 148 frontend tests and 40 backend tests passed, along with ESLint and TypeScript checks. The production build failed because Google Fonts could not be fetched (`EACCES`); live verification also failed with network `EACCES`. The release checker stopped on `EPERM` while scanning the existing `backend/.pytest_cache` directory. No deployment or production performance measurement was completed.

Subsequent candidate verification reached the live career-date question but returned no evidence. A local regression reproduced ordinary supported paraphrases being rejected by vocabulary checks: `started` versus `since`, `remotely` versus `remote`, and `detects` versus `identify`. Those equivalents now require their corresponding evidence concepts. The revised frontend suite passes 155 tests, including negative cases that reject the same words without source support. The candidate's exact rejection cause remains unconfirmed because its runtime logs could not be fetched from the restricted session; use the provider check above before another deployment.

The user's subsequent provider probe confirmed `unsupported_claim` with 824 prompt tokens, 102 completion tokens, one provider call, no 429 and 962 ms latency. The current fix replaces word-by-word rejection with the factual checks described above and bounded completion of omitted citations within the same authored section. All 160 frontend tests, ESLint, TypeScript and the production Next.js build pass. The updated real-provider result still needs verification from a network-enabled terminal; neither the earlier failed candidate nor the local build establishes production success.

Earlier policy 5 verification on November 4, 2026: candidate `frontend-fwz6g713r-yousefalsayed.vercel.app` was deployed to https://yousefalsayed.me. All 165 frontend tests and 17 checks against each deployment passed. Those checks did not cover the subsequent reported refusal followed by the bare `projects` request; that sequence is now required before promotion.

The earlier follow-up failure selected four citations against a three-passage limit. The later `projects` failure reproduced a primary 429 followed by a fallback HTTP 400 `json_validate_failed`, despite strict schema mode. Bare `projects` also lacked brief-topic scope. Authored portfolio overviews now avoid that provider dependency, and schema rejection receives a safe conversational fallback. The owner's latest guide updates the physical graduation robot to ROS2; canonical sources and positive/negative version and hardware tests follow that fact. Candidate failures remain promotion blockers. On this Windows host, deployment and release scanning require access outside the restricted sandbox because of Schannel credential access and protected cache directories.

Last recorded policy 6 release on November 4, 2026: **https://yousefalsayed.me is deployed and verified**, serving `frontend-3z90ylvfg-yousefalsayed.vercel.app`. All 175 frontend tests, 40 backend tests, ESLint, TypeScript, production build and release scan passed. Both the candidate and anonymous public domain passed all 26 checks, including the exact refusal followed by `projects`, the approved bilingual profile, tools follow-up, ROS2 hardware and unsupported-qualification redirect. Public page sections, resume, poster and video passed. The final report is `frontend/.vercel/twin-production-status.json`; earlier failed reports are retained in the same ignored directory. A live preflight also exercised authored recovery after a rejected Groq tools draft, keeping the returned answer grounded in the canonical professional record.

## Policy 7 validation and deployment attempt — November 5, 2026

All 189 frontend tests and 48 backend tests pass, along with ESLint, TypeScript, the production build and release:check. The release scan inspected 231 source files, 201 indexed files, 23 browser files, 32 knowledge files, six required IDs and 36 local assets. Existing staged and unrelated changes were preserved.

The initial build could not fetch Google Fonts because network connections returned EACCES. The previously built Inter and Montserrat WOFF2 assets are now bundled with their original subsets, weights, fallback metrics, preloads and font licenses. The production build succeeds without font downloads. The release checker also excludes the private pytest cache, while rejecting it if offered as a release artifact.

The built app passed real local HTTP checks for policy 7, authored project replies, social replies, a targeted prompt-extraction refusal followed by a clean project question, exact source quotes and font delivery. This report is in ignored `frontend/.vercel/renovation-local-check.json`.

**Policy 7 was not deployed.** The deployment helper stopped at Vercel authentication/network (`whoami` could not fetch). Its report confirms `remoteMutationAttempted: false` and `remoteChangesMade: false`. Independent Groq and Vercel probes returned EACCES; live site verification failed at its health request for the same reason. Real generated answers, token usage and the five-question latency/quota target remain unverified. The previous production report was preserved as `frontend/.vercel/twin-production-status-before-policy7.json`.

Run the existing `npm.cmd --prefix frontend run deploy:vercel -- --site=https://yousefalsayed.me` command from a terminal with Vercel/Groq network access to deploy and run all candidate/public checks. The helper will only promote a candidate that passes them.

## Policy 8: biography follow-up regression

The exact November 5 conversation is now a required regression: an undocumented age gets an honest clarification, the misspelled instruction override remains blocked, and subsequent work, history/histroy, projects and more-about-you questions receive authored first-person answers with exact bilingual portfolio evidence. History combines Motivation, Education and Career. More-about-you combines Profile, Motivation and Current Focus and establishes a new topic after projects. These anchored navigation matches do not accept extra unrelated tasks. No age or new career fact was added.

The native route no longer translates safe draft fallbacks into 502 errors. Generation uses five snippets within 2,800 quote characters, no duplicated persona, one successful low-reasoning call and strict structured prose rather than synthesized raw source quotes. Missing, malformed, unsafe or unsupported drafts return safe HTTP 200 dialogue with no asserted grounding. Natural Arabic is required for Arabic requests. Retry-After is preserved for the browser's bounded retry.

The unit suite exercises the real TypeScript route and widget context, including the exact override followed by ordinary biography questions, illustrative Python, physical ROS2 hardware retrieval, bilingual pivots and output rejection. The live verifier requires the same ordered sequence without retries before promotion. Mocked provider tests do not establish live latency or token-quota performance.

Policy 8 final validation on November 5, 2026: all 171 frontend tests and 49 backend tests passed, along with ESLint, TypeScript, the production build and release checks. The built isolated app passed all 11 local HTTP checks, including the exact reported conversation and an Arabic biography. The age answer invented no age; the override returned 403; all five subsequent portfolio questions returned grounded HTTP 200 replies with zero provider calls. This does not establish live Groq throughput. The main release scan checked 231 source files, 201 indexed files, 23 browser files, 32 knowledge files, six required IDs and 36 assets. The isolated release scan checked 202 source files and the same browser, knowledge and asset counts; its new private repository has no index entries.

Concurrent jobs repeatedly overwrote guardrails and replaced frontend dependencies. The final sources were reconciled and verified in .local/prompt-led-workspace, with its own dependencies and repository boundary. All 108 compared runtime/content/test/config files matched the main workspace at completion. Existing unrelated changes and the main Git index were preserved. The stable local HTTP and deployment reports are copied into frontend/.vercel/followup-local-http-stable.json and followup-stable-deploy-status.json; the validation summary is followup-validation-summary.json.

A separate deployment job uploaded candidate https://frontend-13l68mml3-yousefalsayed.vercel.app while edits were in progress, then failed the DynamoDB Python example with unsupported_claim before promotion. Its report is preserved as frontend/.vercel/twin-production-status-concurrent-candidate-policy8.json. The rejected draft was unavailable, so the exact cause is unconfirmed. A related false positive was reproduced and fixed: a requested illustrative example may say 'not my original production code' without treating that bounded disclaimer as a negated career fact. Other negations, invented tools and unsupported OS claims still fail. In particular, ROS2 or Jetson evidence alone does not establish Ubuntu use.

**This session could not promote the final revision.** The final deployment attempt from the stable copy stopped at Vercel authentication/network because whoami failed to fetch. Its private report records remoteMutationAttempted: false and remoteChangesMade: false. Earlier and concurrent attempts did change remote settings; their reports are preserved separately. Direct Vercel and live-site probes returned EACCES, and the script provider preflight returned unavailable. Live Groq generation, all 38 candidate/public checks and the five-question quota/latency target remain unverified for the final code.

To retry without depending on the other job's installation, run the following from the repository root in a network-enabled terminal. The wrapper loads existing private configuration in memory and invokes the existing deployment helper, including owned-domain resolution and all candidate checks; it does not copy credentials into the isolated source.

    node .local/prompt-led-workspace/run-deployment.mjs
