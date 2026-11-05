import 'server-only';

import policy from '@/data/twin/guardrails.json';

export const guardrailInstructions = policy.single_pass_instructions;
export const guardrailPolicyVersion = policy.version;
export const guardrailAnswerMode = policy.answer_mode;
export const declineReplies = policy.decline_replies;
const inputPatterns = policy.input_patterns.map((pattern) => new RegExp(pattern, 'is'));
const outputPatterns = policy.output_patterns.map((pattern) => new RegExp(pattern, 'is'));
const scope = Object.fromEntries(Object.entries(policy.scope).map(([key, pattern]) => [key, new RegExp(pattern, 'iu')]));

export interface PortfolioEvidence {
  id: string;
  source: string;
  quote: string;
  section?: string;
}

const MAX_ANSWER_CHARS = 2_500;
export const MAX_CANDIDATES = 5;
const MAX_EVIDENCE_PASSAGES = MAX_CANDIDATES;
const MAX_EVIDENCE_CHARS = 2_800;
const normalizeRosVersions = (text: string) => text.replace(/\bROS[ -]+([12])\b/gi, 'ROS$1');

export function portfolioResponseFormat(candidates: PortfolioEvidence[]) {
  return {
    type: 'json_schema',
    json_schema: {
      name: 'portfolio_answer',
      strict: true,
      schema: {
        type: 'object',
        properties: {
          decision: { type: 'string', enum: ['answer', 'insufficient_evidence'] },
          answer: { type: 'string', maxLength: MAX_ANSWER_CHARS },
          passage_ids: {
            type: 'array', items: { type: 'string', ...(candidates.length ? { enum: candidates.map((item) => item.id) } : {}) },
            maxItems: Math.min(MAX_EVIDENCE_PASSAGES, candidates.length),
          },
        },
        required: ['decision', 'answer', 'passage_ids'],
        additionalProperties: false,
      },
    },
  };
}

export const NO_EVIDENCE_REPLY = "I don't have that detail in my portfolio yet. I can walk you through what I've documented, or you can reach me on LinkedIn for the specifics.";
export function replyLanguage(question: string): 'ar' | 'en' {
  if (/\b(?:in English|speak English|answer English)\b/i.test(question)) return 'en';
  return /[\u0600-\u06ff]|\b(?:in Arabic|speak Arabic|answer Arabic)\b/i.test(question) ? 'ar' : 'en';
}

export function noEvidenceReply(question: string): string {
  return replyLanguage(question) === 'ar' ? 'التفصيلة دي مش موثّقة عندي لسه. أقدر أحكيلك عن الموجود في مشاريعي، أو تكلمني على LinkedIn للتفاصيل.' : NO_EVIDENCE_REPLY;
}

export function declineReply(question: string): string {
  return replyLanguage(question) === 'ar' ? declineReplies.ar : declineReplies.en;
}

// A hint for fallback wording, never a gate in front of inference.
export function isForbiddenTopic(message: string): boolean {
  return splitClauses(message).some((clause) => {
    const text = normalized(clause).replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
    return Boolean(text) && scope.forbidden.test(text);
  });
}

function splitClauses(message: string): string[] {
  return message.split(/[.!?؟;\n]+|\b(?:also|and then|and (?=what|how|when|where|why|which|who|do|did|can|could|tell|explain))\b|وايضا|وايضاً/iu)
    .map((clause) => clause.trim()).filter(Boolean);
}

export function socialReply(question: string): string | undefined {
  const text = normalized(question).replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const ar = replyLanguage(question) === 'ar';
  if (scope.thanks.test(text)) return ar ? 'العفو! سعيد إن الكلام فادك.' : "You're welcome! Glad I could help.";
  if (/^(?:nice|cool|great|awesome|interesting|sounds good|حلو|جميل|تمام|ممتاز)$/u.test(text)) {
    return ar ? 'حلو! اسألني عن خبرتي، مشاريعي، أو شغلي الحالي.' : "Thanks! Ask me about my experience, projects, or what I'm working on now.";
  }
  if (scope.wellbeing.test(text) || /^(?:ازيك )?عامل ايه$/.test(text)) return ar ? 'تمام، شكراً إنك سألت! تحب تعرف إيه عن شغلي؟' : "I'm doing well, thanks for asking! What would you like to know about my work?";
  if (scope.language.test(text)) return ar ? 'أكيد، نتكلم بالعربي! تحب تعرف إيه عني أو عن شغلي؟' : 'Of course, we can chat in English! What would you like to know about me or my work?';
  if (scope.greeting.test(text)) return ar ? 'أهلًا بيك! تحب نحكي عن الروبوتات، الذكاء الاصطناعي، ولا مشاريعي؟' : 'Hey! Happy to chat about my robots, AI work, or projects. What are you curious about?';
}

export function portfolioEvidence(context: string, query = ''): PortfolioEvidence[] {
  const candidates: PortfolioEvidence[] = [];
  const blocks = context.replace(/\r\n?/g, '\n').split(/\[Source: ([^\]\n|]+) \| [^\]\n]*\]\n/);
  for (let index = 1; index + 1 < blocks.length; index += 2) {
    const source = blocks[index].trim();
    if (!/^[\w./-]+\.md$/.test(source)) continue;
    const body = blocks[index + 1].replace(/^---\n[\s\S]*?\n---\n?/, '');
    let section: string | undefined;
    for (const paragraph of body.split(/\n\s*\n/)) {
      const heading = paragraph.match(/^(?:#{1,6} |\[Section: )([^\n\]]+)/);
      if (heading) section = heading[1].slice(0, 160);
      const quote = paragraph.replace(/^(?:(?:#{1,6} |\[Section: )[^\n]*\n)+/, '').trim();
      if (!quote || quote.length > 900 || /```|^(?:#{1,6} |\[Section: |---$|(?:title|slug|type|order|image|image_url|repo_url):)/.test(quote)) continue;
      if (hasPromptInjection(quote) || candidates.some((item) => item.source === source && item.quote === quote)) continue;
      candidates.push({ id: `p${candidates.length}`, source, quote, ...(section ? { section } : {}) });
    }
  }
  const terms = normalized(query).match(/[\p{L}\p{N}]+/gu)?.filter((word) => word.length > 3) ?? [];
  const sourceOrder = [...new Set(candidates.map((item) => item.source))];
  const ranked = candidates.map((item, order) => ({ item, order,
    score: terms.filter((term) => normalized(item.quote).includes(term)).length,
  })).sort((a, b) => sourceOrder.indexOf(a.item.source) - sourceOrder.indexOf(b.item.source)
    || b.score - a.score || a.order - b.order);
  const selected: PortfolioEvidence[] = [];
  let remaining = MAX_EVIDENCE_CHARS;
  for (const { item } of ranked) {
    if (item.quote.length > remaining) continue;
    selected.push({ ...item, id: `p${selected.length}` });
    remaining -= item.quote.length;
    // Do not offer more distinct citations than an accepted answer can use.
    // Groq can reject an over-selection before returning a strict-mode draft.
    if (selected.length === MAX_CANDIDATES) break;
  }
  return selected;
}

export function parsePortfolioAnswer(content: string, candidates: PortfolioEvidence[]): { selected: PortfolioEvidence[]; answer: string } {
  const value: unknown = JSON.parse(content);
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid evidence selection');
  const selection = value as Record<string, unknown>;
  if (Object.keys(selection).sort().join(',') !== 'answer,decision,passage_ids') throw new Error('Invalid evidence selection');
  if (selection.decision !== 'answer' && selection.decision !== 'insufficient_evidence') throw new Error('Invalid evidence selection');
  if (typeof selection.answer !== 'string' || !selection.answer.trim() || selection.answer.length > MAX_ANSWER_CHARS) throw new Error('Invalid evidence selection');
  if (!Array.isArray(selection.passage_ids) || selection.passage_ids.length > MAX_EVIDENCE_PASSAGES
    || selection.passage_ids.some((id) => typeof id !== 'string')
    || new Set(selection.passage_ids).size !== selection.passage_ids.length) throw new Error('Invalid evidence selection');
  if (selection.decision === 'insufficient_evidence') {
    if (selection.passage_ids.length || selection.answer.length > 600) throw new Error('Invalid evidence selection');
    return { selected: [], answer: selection.answer.trim() };
  }
  if (!selection.passage_ids.length) throw new Error('Missing evidence');
  const selected = selection.passage_ids.map((id) => {
    const item = candidates.find((candidate) => candidate.id === id);
    if (!item) throw new Error('Unverified evidence');
    return item;
  });
  return { selected, answer: selection.answer.trim() };
}

// Only complete fenced examples are omitted from factual prose checks. Their
// entire contents still pass the output leak/link shield before being displayed.
export function answerProse(answer: string): string {
  return answer
    .replace(/^```[\w+-]*[^\S\r\n]*\r?\n[\s\S]*?^```[^\S\r\n]*(?:\r?\n|$)/gm, '')
    .replace(/\[Source:\s*[^\]]+\]/g, '')
    .trim();
}

export function isIllustrativeCode(answer: string, question: string): boolean {
  if (!answer.includes('```')) return true;
  const prose = answerProse(answer);
  return !prose.includes('```')
    && /\b(?:code|script|python|example|snippet|implement)\b|كود|سكربت|مثال|بايثون/i.test(question)
    && /\b(?:illustrative|example|simplified|sketch)\b|توضيحي|للتوضيح|مثال|مبس[ّط]/u.test(prose.toLowerCase());
}

export function isConversationalReply(answer: string, question: string, secret?: string): boolean {
  return Boolean(answer.trim()) && answer.length <= 600 && !answer.includes('```')
    && /[\u0600-\u06ff]/.test(answer) === (replyLanguage(question) === 'ar')
    && !hasPromptInjection(answer) && isSafeReply(answer, '', secret)
    && !/\bi (?:have|hold|earned|won|studied|graduated|joined|built|developed|use|used)\b|\bmy (?:favou?rite|salary|degree|employer)\b|(?:انا (?:عندي|درست|اتخرجت|بستخدم)|بحب اكل|المفضل عندي|راتبي)/iu.test(normalized(answer))
    && hasSupportedNumbers(answer, []);
}

export function hasSupportedNumbers(answer: string, evidence: { quote: string }[]): boolean {
  // Keep signs, decimals, grouping, and percentages intact (1.5 is not 5 or 15).
  const digits = (text: string) => normalizeRosVersions(text.normalize('NFKC')
    .replace(/[٠-٩۰-۹]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹'.indexOf(digit) % 10))
    .replace(/٫/g, '.').replace(/٬/g, ',').replace(/٪/g, '%'))
    .replace(/\bboto3\b/gi, 'boto')
    .match(/[-+]?\d+(?:,\d{3})*(?:\.\d+)?%?/g) ?? [];
  const supported = new Set(evidence.flatMap((item) => digits(item.quote)));
  return digits(answerProse(answer)).every((number) => supported.has(number));
}

// Deterministic factual-anchor checks, not a semantic entailment proof.
// Technical names stay in English in both languages.
const conversationalWords = new Set(('i me my myself we our you your it its a an the and or of at in on to for from with as by is am are was were be been have has had do did can this that these those through into about also mainly use used using work worked working build built building develop developed developing focus focused include includes including yes sure absolutely happy glad thanks welcome great really practical hands hands-on help helps helped part experience skills tools background portfolio project projects مثلا انا عندي شغلي بستخدم استخدمت باستخدام اشتغلت بشتغل عملت بعمل بنيت ببني طورت بطور في من علي مع و او ده دي دا اللي كان كانت بيكون هو هي ان عشان كمان بشكل ايوه طبعا اكيد اهلا سعيد شكرا اقدر عندنا عندي انا وانا فيه فيها بتاعي بتاعتي كورة كرة قدم أنمي انمي أغسطس اغسطس مواليد اتولدت هوايات هواياتك').split(' '));
// Grammatical words do not establish qualifications, technologies or dates.
for (const word of [
  'their', 'them', 'which', 'where', 'while', 'when', 'how', 'what', 'why', 'if', 'once', 'then', 'both', 'each', 'within', 'across', 'so',
  'here', 'example', 'examples', 'illustrative', 'simplified', 'snippet', 'snippets',
  'code', 'source', 'script', 'scripts', 'sample', 'samples', 'sketch',
  'demonstrate', 'demonstrates', 'demonstrating', 'demonstration',
  'show', 'shows', 'showing', 'below', 'following', 'handler', 'event', 'events',
  'record', 'records', 'trigger', 'triggers', 'triggered', 'process', 'processes', 'processing',
  'stream', 'streams', 'setup', 'pipeline', 'workflow', 'function', 'note', 'please',
  'mechanism', 'keeps', 'under', 'cost', 'costs', 'control', 'controls',
  'perform', 'performed', 'performing', 'module', 'modules', 'enable', 'enabling', 'enabled', 'fed', 'feed',
  'like', 'related', 'ecosystem', 'ecosystems', 'language', 'languages', 'programming', 'firmware',
  'microcontroller', 'microcontrollers', 'library', 'libraries', 'framework', 'frameworks',
  'frontend', 'backend', 'stack', 'stacks', 'comfortable', 'familiar', 'environment', 'environments',
  'additional', 'further', 'key', 'core', 'main', 'other', 'several', 'practical', 'similar', 'recent',
  'handling', 'packaging', 'integration', 'integrations', 'integrating', 'integrated', 'security',
  'authentication', 'authorization', 'validation', 'validating', 'validated', 'logging', 'telemetry',
  'latency', 'polling', 'architecture', 'architected', 'rearchitected', 'logic', 'interface',
  'interfaces', 'component', 'components', 'service', 'services', 'system', 'systems', 'loop',
  'loops', 'interval', 'intervals', 'model', 'models', 'simulation', 'simulations', 'robot',
  'robots', 'hardware', 'platform', 'platforms', 'solution', 'solutions', 'application',
  'applications', 'protocol', 'protocols', 'agent', 'agents', 'driver', 'drivers', 'companion',
  'ui', 'ux', 'gui', 'app', 'apps', 'day', 'days', 'daily', 'routine', 'regularly',
  'cutting', 'reducing', 'lowering', 'improving', 'bringing', 'achieving', 'serving', 'creating',
  'building', 'production', 'staging', 'deployment', 'deployments', 'deploying', 'deployed',
  'version', 'versions', 'feature', 'features', 'task', 'tasks', 'issue', 'issues', 'bug',
  'bugs', 'fix', 'fixes', 'fixing', 'fixed', 'test', 'tests', 'testing', 'tested', 'unit',
  'smoke', 'automated', 'automation', 'continuous', 'metric', 'metrics', 'alert', 'alerts',
  'alerting', 'speed', 'fast', 'faster', 'rate', 'rates', 'volume', 'traffic', 'load',
  'data', 'rag', 'github', 'repo', 'repository', 'api', 'apis', 'rest', 'fastapi',
  'pipeline', 'pipelines', 'endpoint', 'endpoints', 'log', 'logs', 'logger', 'logging',
  'table', 'tables', 'database', 'databases', 'feel', 'free', 'reach', 'dive', 'let', 'know',
  'ask', 'questions', 'details', 'check', 'contact', 'connect', 'find', 'see', 'look', 'instead',
  'rather', 'than', 'via', 'through', 'minimal', 'brief', 'sample', 'example', 'below', 'shows',
  'showing', 'trigger', 'triggered', 'base', 'bases', 'chassis', 'mobile', 'drive', 'wheel',
  'wheels', 'camera', 'cameras', 'sensor', 'sensors', 'motor', 'motors', 'actuator', 'actuators',
  'node', 'nodes', 'package', 'packages', 'environment', 'environments', 'demo', 'demos',
  'custom', 'template', 'templates', 'codebase', 'configured', 'configuring', 'configuration',
  'downstream', 'upstream', 'schema', 'schemas', 'tweak', 'tweaks', 'match', 'matches',
  'listen', 'listening', 'push', 'pushing', 'queue', 'queues', 'placeholder', 'placeholders',
  'aggregator', 'aggregating', 'publish', 'publishing', 'index', 'indexes', 'indices', 'gpu', 'gpus', 'dockerized', 'containerized', 'sdk', 'sdks', 'boto', 'boto3', 'json', 'module', 'modules', 'stream', 'streams', 'football', 'anime', 'august', 'born', 'hobbies', 'hobby', 'interests', 'interest', 'personal'
]) conversationalWords.add(word);

// These are evidence-dependent equivalents, never a global permission to name
// tools or employers. In particular, AI is an abbreviation of the source phrase.
const englishEvidenceTerms: Record<string, RegExp> = {
  ai: /\b(?:ai|artificial intelligence)\b/i,
  rag: /\b(?:rag|retrieval|vector|llms?|ai|nlp)\b/i,
  github: /\b(?:github|repository|repo|code)\b/i,
  repo: /\b(?:github|repository|repo|code)\b/i,
  repository: /\b(?:github|repository|repo|code)\b/i,
  data: /\b(?:data|telemetry|logs?|stream(?:s|ing)?|database|dynamodb)\b/i,
  fastapi: /\b(?:fastapi|python|api|rest)\b/i,
  langchain: /\b(?:langchain|python|ai|agents?|llms?)\b/i,
  langgraph: /\b(?:langgraph|python|ai|agents?|llms?)\b/i,
  pytorch: /\b(?:pytorch|python|ai|deep learning|ml|models?)\b/i,
  qlora: /\b(?:qlora|python|ai|fine-?tuning|llms?)\b/i,
  langfuse: /\b(?:langfuse|python|ai|monitoring|tracing|observability)\b/i,
  docker: /\b(?:docker|container|containers|devops|aws|deployment|python|dockerized|containerized)\b/i,
  dockerized: /\b(?:docker|container|containers|devops|aws|deployment|python|dockerized|containerized)\b/i,
  containerized: /\b(?:docker|container|containers|devops|aws|deployment|python|dockerized|containerized)\b/i,
  gpu: /\b(?:gpu|cpu|soc|jetson|nvidia|nano|hardware|embedded|robot)\b/i,
  gpus: /\b(?:gpu|cpu|soc|jetson|nvidia|nano|hardware|embedded|robot)\b/i,
  api: /\b(?:api|apis|rest|fastapi|endpoints?)\b/i,
  apis: /\b(?:api|apis|rest|fastapi|endpoints?)\b/i,
  iam: /\b(?:aws|sam|lambda|dynamodb|cloud)\b/i,
  boto3: /\b(?:python|aws|lambda|dynamodb|boto3?)\b/i,
  boto: /\b(?:python|aws|lambda|dynamodb|boto3?)\b/i,
  sdk: /\b(?:sdk|sdks|boto3?|api|apis|library|libraries|tools?)\b/i,
  sdks: /\b(?:sdk|sdks|boto3?|api|apis|library|libraries|tools?)\b/i,
  json: /\b(?:json|data|payload|telemetry|log|logs|python|api)\b/i,
  module: /\b(?:module|modules|package|packages|library|libraries|code|python)\b/i,
  modules: /\b(?:module|modules|package|packages|library|libraries|code|python)\b/i,
  football: /\b(?:football|sports?|hobbies|free time)\b/i,
  anime: /\b(?:anime|manga|animation|hobbies|free time)\b/i,
  august: /\b(?:august|2000|born|birthday)\b/i,
  born: /\b(?:born|august|2000|age|birthday)\b/i,
  hobbies: /\b(?:hobbies|interests|football|anime|free time)\b/i,
  ui: /\b(?:ui|ux|pyqt5?|desktop|interface|front-?end|designer)\b/i,
  ux: /\b(?:ui|ux|pyqt5?|desktop|interface|front-?end|designer)\b/i,
  gui: /\b(?:ui|ux|pyqt5?|desktop|interface|front-?end|designer)\b/i,
  gsi: /\b(?:gsi1?|dynamodb|dynamologreader)\b/i,
  gsi1: /\b(?:gsi1?|dynamodb|dynamologreader)\b/i,
  index: /\b(?:index|indexes|indices|gsi1?|dynamodb|database|db)\b/i,
  indexes: /\b(?:index|indexes|indices|gsi1?|dynamodb|database|db)\b/i,
  indices: /\b(?:index|indexes|indices|gsi1?|dynamodb|database|db)\b/i,
  manage: /\b(?:manage|manages|managing|managed|control|controls|controlling|controlled)\b/i,
  managed: /\b(?:manage|manages|managing|managed|control|controls|controlling|controlled)\b/i,
  managing: /\b(?:manage|manages|managing|managed|control|controls|controlling|controlled)\b/i,
  started: /\b(?:since|started|joined)\b/i,
  joined: /\b(?:since|started|joined)\b/i,
  remotely: /\bremote(?:ly)?\b/i,
  detect: /\b(?:identify|identifies|identifying|detect|detects|detecting|detection|lidar|depth|slam|sensor fusion)\b/i,
  detects: /\b(?:identify|identifies|identifying|detect|detects|detecting|detection|lidar|depth|slam|sensor fusion)\b/i,
  detecting: /\b(?:identify|identifies|identifying|detect|detects|detecting|detection|lidar|depth|slam|sensor fusion)\b/i,
  detection: /\b(?:identify|identifies|identifying|detect|detects|detecting|detection|lidar|depth|slam|sensor fusion)\b/i,
  involves: /\b(?:role|work|develops|built)\b/i,
  ros: /\bros[ -]?(?:1|2)?\b/i,
  ros1: /\bros[ -]?1\b/i,
  ros2: /\bros[ -]?2\b/i,
  ran: /\b(?:ran|runs?|running|integrated|navigated|used)\b/i,
  running: /\b(?:ran|runs?|running|integrated|navigated|used)\b/i,
  run: /\b(?:ran|runs?|running|integrated|navigated|used)\b/i,
  runs: /\b(?:ran|runs?|running|integrated|navigated|used)\b/i,
  // Hardware and ROS versions do not establish which OS I actually used.
  ubuntu: /\bubuntu\b/i,
  linux: /\b(?:linux|ubuntu)\b/i,
  calculate: /\b(?:lidar|slam|navigation|sensor fusion|depth)\b/i,
  calculates: /\b(?:lidar|slam|navigation|sensor fusion|depth)\b/i,
  calculating: /\b(?:lidar|slam|navigation|sensor fusion|depth)\b/i,
  calculation: /\b(?:lidar|slam|navigation|sensor fusion|depth)\b/i,
  calculations: /\b(?:lidar|slam|navigation|sensor fusion|depth)\b/i,
  distance: /\b(?:lidar|slam|navigation|sensor fusion|depth)\b/i,
  distances: /\b(?:lidar|slam|navigation|sensor fusion|depth)\b/i,
  obstacle: /\b(?:lidar|slam|navigation|sensor fusion|depth)\b/i,
  obstacles: /\b(?:lidar|slam|navigation|sensor fusion|depth)\b/i,
  avoidance: /\b(?:lidar|slam|navigation|sensor fusion|depth)\b/i,
  know: /\b(?:skills|expertise)\b/i,
  javascript: /\b(?:javascript|js|react|typescript|node)\b/i,
  js: /\b(?:javascript|js|react|typescript|node)\b/i,
  react: /\b(?:react|javascript|js)\b/i,
  turkey: /\b(?:türkiye|turkey|istanbul)\b/i,
  türkiye: /\b(?:türkiye|turkey|istanbul)\b/i,
  turkish: /\b(?:türkiye|turkey|istanbul)\b/i,
  ve: /\b(?:has been|have|worked)\b/i,
  m: /\b(?:engineer|intern|instructor)\b/i,
};
const arabicEvidenceTerms: Record<string, RegExp> = {
  كورة: /football/i, كرة: /football/i, قدم: /football/i, انمي: /anime/i, أنمي: /anime/i,
  مواليد: /born|august|2000/i, اتولدت: /born|august|2000/i, هوايات: /hobbies|interests|football|anime/i, هواياتك: /hobbies|interests|football|anime/i,
  يناير: /january/i, فبراير: /february/i, مارس: /march/i, ابريل: /april/i,
  مايو: /may/i, يونيو: /june/i, يوليو: /july/i, اغسطس: /august/i,
  سبتمبر: /september/i, اكتوبر: /october/i, نوفمبر: /november/i, ديسمبر: /december/i,
  بدات: /since|from|started/i, شغال: /work|role|intern|engineer/i,
  انضممت: /since|joined/i, انضميت: /since|joined/i,
  بناء: /build|built|develop/i, بشتغل: /work|develop|intern/i,
  بيركز: /focus|develop/i, بيقرا: /reads?/i, بيساعد: /helps?/i,
  لحظيه: /real.time/i, لحظية: /real.time/i, مباشر: /live|real.time/i,
  اسطول: /fleet/i, سجلات: /logs?/i, مشاكل: /issues|anomalies/i,
  اكتشاف: /identify|detect/i, اكتشف: /identify|detect/i,
  مهندس: /engineer/i, هندسه: /engineering/i, هندسة: /engineering/i,
  ميكاترونكس: /mechatronics/i, روبوت: /robot/i, روبوتات: /robot/i,
  ذكاء: /\bai\b|artificial intelligence/i, اصطناعي: /\bai\b|artificial intelligence/i,
  اصطناعيه: /\bai\b|artificial intelligence/i, اصطناعية: /\bai\b|artificial intelligence/i,
  برمجه: /programming|coding/i, برمجة: /programming|coding/i,
  اتمته: /automat/i, اتمتة: /automat/i, انظمه: /systems?/i, انظمة: /systems?/i,
  تطبيقات: /applications?|apps?/i, تطبيق: /applications?|apps?/i,
  مشاريع: /projects?/i, مشروع: /projects?/i, التخرج: /graduation/i,
  خبره: /experience/i, خبرة: /experience/i, ادوات: /tools?/i,
  متدرب: /intern/i, تدريب: /intern|training/i, مراقبه: /monitor/i, مراقبة: /monitor/i,
  كملت: /completed/i,
  بيانات: /data/i, حلول: /solutions?/i, تطوير: /develop/i, تقنيات: /technolog/i,
  ذاتي: /autonomous/i, التحكم: /control/i, يوسف: /yousef/i, السيد: /alsayed/i,
  عبدالفتاح: /abdelfattah/i, القاهره: /cairo/i, القاهرة: /cairo/i, مصر: /egypt/i,
};

export interface ClaimValidation {
  supported: boolean;
  reason?: 'language' | 'scope' | 'unsupported_facts';
  unsupported_terms: string[];
}

export function inspectSupportedClaims(answer: string, evidence: { quote: string }[], question: string): ClaimValidation {
  if (!isIllustrativeCode(answer, question)) return { supported: false, reason: 'scope', unsupported_terms: [] };
  const hasExample = answer.includes('```');
  answer = answerProse(answer);
  if (/[\u0600-\u06ff]/.test(answer) !== (replyLanguage(question) === 'ar')) return { supported: false, reason: 'language', unsupported_terms: [] };
  if (hasPromptInjection(answer)) return { supported: false, reason: 'scope', unsupported_terms: [] };
  // A requested illustrative example may disclaim being original source. This
  // labels the example; it does not negate a portfolio fact. Other negations
  // still require evidence, and leak/link checks inspect the entire answer.
  if (hasExample) {
    answer = answer
      .replace(/\bnot\s+(?:(?:my|the|a|an)\s+)?(?:(?:original|actual|exact|production|real|live)\s+)*(?:source(?:[ -]code)?|code|script|implementation)\b/gi, '')
      .replace(/\b(?:for )?(?:illustrative|demonstration|example)? (?:purposes? )?only\b/gi, '')
      .replace(/\bonly (?:an? )?(?:illustrative|simplified|sample|example)\b/gi, '');
  }
  // Treat ROS 1 / ROS-1 as ROS1 without merging the ROS1 and ROS2 facts.
  const reference = normalizeRosVersions(evidence.map((item) => item.quote).join('\n'));
  const claimText = normalizeRosVersions(answer);
  const stem = (word: string): string[] => {
    if (word.length <= 3) return [word];
    const forms = [word];
    if (word.endsWith('ies')) forms.push(word.replace(/ies$/, 'y'));
    if (word.endsWith('ing')) {
      forms.push(word.replace(/ing$/, ''));
      forms.push(word.replace(/ing$/, 'e'));
    }
    if (word.endsWith('ed')) {
      forms.push(word.replace(/ed$/, ''));
      forms.push(word.replace(/d$/, ''));
    }
    if (word.endsWith('s')) forms.push(word.replace(/s$/, ''));
    return forms;
  };
  const tokens = (text: string) => normalized(text).replace(/[٠-٩۰-۹]/g,
    (digit) => String('٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹'.indexOf(digit) % 10)).match(/[\p{L}\p{N}]+/gu) ?? [];
  const supported = new Set(tokens(reference).flatMap((word) => stem(word)));
  const supportedTerm = (word: string): boolean => {
    if (supported.has(word) || stem(word).some((form) => supported.has(form)) || conversationalWords.has(word)) return true;
    if (englishEvidenceTerms[word]?.test(reference)) return true;
    const arabic = word.replace(/^و(?=.{3})/, '');
    const root = arabic.replace(/^(?:لل|ل|ب)(?=.{3})/, '').replace(/^ال/, '');
    const concept = arabicEvidenceTerms[arabic] ?? arabicEvidenceTerms[arabic.replace(/^ال/, '')] ?? arabicEvidenceTerms[root];
    return supported.has(arabic) || conversationalWords.has(arabic) || Boolean(concept?.test(reference));
  };

  // Check factual anchors, not every word in a paraphrase. A vocabulary allowlist
  // rejects harmless grammar while still failing to prove semantic entailment.
  const anchors = new Set<string>();
  const add = (text: string) => tokens(text).forEach((word) => anchors.add(word));

  // Proper names, acronyms and mixed-case technical identifiers. Ordinary
  // sentence openings are not evidence claims by themselves.
  const sentenceOpeners = new Set(('since currently today now there here during after before alongside additionally additional primarily specifically typically overall beyond together having developing building working helping focusing monitoring identifying detecting analyzing analysing handling maintaining improving using starting joining responsible responsibilities mainly below note please key core main other further important several these those each every such recent related previous first second third finally similarly furthermore moreover likewise instead cutting reducing lowering bringing achieving serving daily day feel free let reach dive check see look ask sure certainly here when whenever while where if once then the this that these those in on at for with by from to as both all').split(' '));
  for (const match of claimText.matchAll(/(?<![A-Za-z0-9])(?:\p{Lu}[\p{L}\p{N}]*|[a-z]+\p{Lu}[\p{L}\p{N}]*)(?:[+#]+)?/gu)) {
    const word = match[0];
    const lower = word.toLowerCase();
    if (word === 'I' || conversationalWords.has(lower) || sentenceOpeners.has(lower)
      || englishEvidenceTerms[lower]?.test(reference)) continue;
    add(word);
  }

  // Catch factual assertions even when their names are lowercased. Stop noun
  // phrases at relative clauses and purpose phrases so free prose stays free.
  const phrases = [
    /\b(?:use|used|using|know|proficient in|experience with|skilled in|expertise in|speciali[sz]e in|built with|worked with)\s+([^.!?;:\n]{1,160})/gi,
    /\b(?:joined|employed by|work(?:ed|ing)? at|intern at|internship at|studied at|graduated from|degree (?:in|from)|doctorate (?:in|from)|phd (?:in|from))\s+([^.!?;:\n]{1,120})/gi,
  ];
  const nounGlue = new Set(('a an the and or with for to in on at my our primarily mainly extensively mostly various several combination mix together well such as especially particularly practical real time like related along other similar associated different model models simulation simulations robot hardware platform solution application protocol day days daily instead rather than of via through into by base bases chassis mobile camera cameras sensor sensors environment package node custom downstream upstream template demo schema index indexes gpu gpus 2 1 dockerized containerized when sdk sdks boto boto3 json module modules stream streams football anime august born 2000 26').split(' '));
  for (const pattern of phrases) {
    for (const match of claimText.matchAll(pattern)) {
      const nounPhrase = match[1].split(/\b(?:to|for|that|which|where|while|since|because|so|when|in|on|at|as|and I|and we)\b|[—–]/i)[0];
      for (const word of tokens(nounPhrase)) if (!nounGlue.has(word)) anchors.add(word);
    }
  }

  // Credentials, leadership, availability and achievements cannot be introduced
  // merely because the employer or technology appears somewhere in a quote.
  for (const match of answer.matchAll(/\b(?:phd|doctorate|doctoral|degree|bachelor|masters?|diploma|certificate|certification|professor|ceo|cto|founder|cofounder|founded|invented|patented|led|managed|supervised|won|awarded|graduated|certified|fluent|available|salary|millionaire|billionaire|started|remotely|detect|detects|detecting|detection)\b|(?:دكتوراه|دكتوراة|ماجستير|بكالوريوس|اسست|أسست|مدير|رئيس|راتب|متاح)/gi)) add(match[0]);
  for (const match of answer.matchAll(/\b(?:never|not|only|always|million|billion|trillion|hundred|thousand)\b/gi)) {
    if (hasExample && match[0].toLowerCase() === 'only') continue;
    add(match[0]);
  }
  if (/\b(?:don['’]t|didn['’]t|haven['’]t|can['’]t|isn['’]t)\b/i.test(answer)) anchors.add('not');
  const unsupported = [...anchors].filter((word) => !supportedTerm(word));
  return { supported: !unsupported.length, ...(unsupported.length ? { reason: 'unsupported_facts' as const } : {}),
    unsupported_terms: [...new Set(unsupported)].slice(0, 24) };
}

export function hasSupportedClaims(answer: string, evidence: { quote: string }[], question: string): boolean {
  return inspectSupportedClaims(answer, evidence, question).supported;
}

export function completeEvidenceSelection(answer: string, selected: PortfolioEvidence[], candidates: PortfolioEvidence[], question: string, secret?: string): PortfolioEvidence[] {
  const supports = (items: PortfolioEvidence[]) => isSafeReply(answer, items.map((item) => item.quote).join('\n'), secret)
    && hasSupportedNumbers(answer, items) && hasSupportedClaims(answer, items, question);
  if (supports(selected) || selected.length >= MAX_EVIDENCE_PASSAGES) return selected;
  // A draft can use a supplied fact but omit its ID. Add only exact candidates
  // from the same document AND authored section, never another employer/project.
  const eligible = candidates.filter((candidate) => !selected.some((item) => item.id === candidate.id)
    && selected.some((item) => item.source === candidate.source))
    .slice(0, MAX_CANDIDATES);
  // At most five candidates: exhaust the small set, preferring fewer citations.
  const combinations = (start: number, count: number, extra: PortfolioEvidence[]): PortfolioEvidence[] | undefined => {
    if (!count) {
      const completed = [...selected, ...extra];
      return supports(completed) ? completed : undefined;
    }
    for (let i = start; i <= eligible.length - count; i++) {
      const result = combinations(i + 1, count - 1, [...extra, eligible[i]]);
      if (result) return result;
    }
  };
  for (let count = 1; count <= Math.min(eligible.length, MAX_EVIDENCE_PASSAGES - selected.length); count++) {
    const result = combinations(0, count, []);
    if (result) return result;
  }
  return selected;
}

// Inspect a bounded set of common obfuscations; never execute decoded content.
function normalized(text: string): string {
  return text.normalize('NFKC').toLowerCase()
    .replace(/[іаесорху]/g, (letter) => ({ і: 'i', а: 'a', е: 'e', с: 'c', о: 'o', р: 'p', х: 'x', у: 'y' })[letter] ?? letter)
    .replace(/[\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff\u064b-\u065f\u0670]/g, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/[ \t]+/g, ' ');
}

function decoded(text: string): string {
  return text.replace(/\\u([\da-f]{4})|\\x([\da-f]{2})|&#x([\da-f]{1,6});?|&#(\d{1,7});?/gi,
    (match, unicode, hex, entityHex, decimal) => {
      const code = Number.parseInt(unicode ?? hex ?? entityHex ?? decimal, decimal ? 10 : 16);
      return code <= 0x10ffff ? String.fromCodePoint(code) : match;
    }).replace(/(?:%[\da-f]{2})+/gi, (match) => {
    try { return decodeURIComponent(match); } catch { return match; }
  });
}

function variants(text: string): string[] {
  const values = [text];
  for (let round = 0; round < 2; round++) values.push(decoded(values.at(-1)!));
  for (const token of text.match(/[A-Za-z0-9+/_-]{24,}={0,2}/g)?.slice(0, 16) ?? []) {
    if (token.length > 8_000) continue;
    values.push(Buffer.from(token, 'base64').toString('utf8'));
  }
  return values.map(normalized).flatMap((value) => [value, value.replace(/\s+/g, ' ')]);
}

export function hasPromptInjection(text: string): boolean {
  return variants(text).some((value) => inputPatterns.some((pattern) => pattern.test(value)));
}

export function hasPortfolioScope(message: string, aliases: string[] = [], topic?: string): boolean {
  const words = (text: string) => normalized(text).replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
    .replace(/\bhis\b/gu, 'your')
    .replace(/\bhistroy\b/gu, 'history')
    .replace(/\bexper(?:ience|ince|iance|infce)\b/gu, 'experience');
  const scoped = (clause: string, inherited: boolean) => {
    const text = words(clause).replace(/^(?:ok(?:ay)?|alright|well|so|then|sure|please)(?: then)? /u, '').trim();
    if (!text || scope.forbidden.test(text)) return false;
    if (scope.greeting.test(text)) return true;
    if (scope.thanks.test(text) || scope.wellbeing.test(text) || scope.language.test(text)) return true;
    if (scope.identity.test(text) || /\b(?:how old are you|what s your age|what is your age|tell me your age|age)\b/u.test(text)) return true;
    if (scope.brief_topic.test(text)) return true;
    if (inherited && scope.followup.test(text)) return true;
    const named = aliases.some((alias) => words(alias).length >= 4 && ` ${text} `.includes(` ${words(alias)} `));
    const subject = scope.subject.test(text) || scope.casual_subject.test(text)
      || /\b(?:age|older|younger|born|birthday)\b/u.test(text)
      || (inherited && scope.reference.test(text));
    return named || (subject && (scope.topic.test(text) || scope.casual_topic.test(text) || /^(?:who are you|من انت)$/.test(text)));
  };
  let inherited = Boolean(topic && hasPortfolioScope(topic, aliases));
  const clauses = splitClauses(message);
  if (!clauses.length) return false;
  for (const clause of clauses) {
    if (!scoped(clause, inherited)) return false;
    inherited = true;
  }
  return true;
}

function urls(text: string): string[] {
  const explicit = text.match(/(?:https?:\/\/|mailto:)[^\s<>"'`\])]+/gi) ?? [];
  const markdown = Array.from(text.matchAll(/\[[^\]]*\]\(\s*([^\s)]+)[^)]*\)/g), (match) => match[1]);
  const contacts = text.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b|\b(?:[a-z0-9-]+\.)+(?:com|me|org|net|io|dev|test)(?:\/[^\s<>"'`\])]+)?/gi) ?? [];
  return [...explicit, ...markdown, ...contacts].map((url) => url.replace(/[.,;!?]+$/, ''));
}

export function isSafeReply(text: string, reference: string, secret?: string): boolean {
  const values = variants(text);
  if (values.some((value) => outputPatterns.some((pattern) => pattern.test(value)))) return false;
  if (secret && values.some((value) => value.includes(normalized(secret)))) return false;
  const instructions = normalized(guardrailInstructions);
  // Catch verbatim instruction leakage even if the model omits a prompt label.
  if (instructions.split(/[.\n]/).some((sentence) => sentence.trim().length >= 65
    && values.some((value) => value.includes(sentence.trim())))) return false;
  const allowed = new Set(urls(reference));
  return urls(text).every((url) => allowed.has(url) || (text.includes('```') && /\b(?:amazonaws\.com|example\.(?:com|org)|localhost)\b/i.test(url)));
}
