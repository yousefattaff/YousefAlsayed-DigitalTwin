import 'server-only';

import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { parseMarkdown } from '@/lib/content';
import {
  guardrailInstructions,
  guardrailPolicyVersion,
  guardrailAnswerMode,
  hasPortfolioScope,
  hasPromptInjection,
  isSafeReply,
  isConversationalReply,
  hasSupportedNumbers,
  inspectSupportedClaims,
  completeEvidenceSelection,
  type ClaimValidation,
  portfolioEvidence,
  portfolioResponseFormat,
  parsePortfolioAnswer,
  socialReply,
  noEvidenceReply,
  declineReply,
  replyLanguage,
} from '@/lib/guardrails';

export const PRIMARY_MODEL = 'openai/gpt-oss-120b';
export const FALLBACK_MODEL = 'openai/gpt-oss-20b';
type GroqModel = typeof PRIMARY_MODEL | typeof FALLBACK_MODEL;
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const PROVIDER_DEADLINE_MS = 25_000;
const MAX_MESSAGE_CHARS = 2_000;
const MAX_HISTORY_MESSAGES = 12;
const MAX_HISTORY_CHARS = 12_000;
const MAX_TOPIC_CHARS = 300;
const MAX_REQUEST_BYTES = 100_000;
const MAX_PROVIDER_BYTES = 64_000;
const MAX_RESPONSE_CHARS = 10_000;
const MAX_DOCUMENTS = 64;
const MAX_DOCUMENT_BYTES = 64_000;
const MAX_CONTEXT_CHARS = 6_000;
const MAX_SYSTEM_CHARS = 9_000;

export interface TwinHistoryEntry {
  role: 'user' | 'assistant';
  content: string;
}

export interface TwinChatInput {
  message: string;
  session_id?: string;
  history: TwinHistoryEntry[];
  topic?: string;
}

export interface TwinSource {
  source: string;
  title: string;
}

export type TwinFallbackReason =
  | 'no_candidates'
  | 'model_missing_evidence'
  | 'invalid_provider_json'
  | 'empty_completion'
  | 'truncated_completion'
  | 'provider_content_filter'
  | 'unexpected_tool_call'
  | 'invalid_selection'
  | 'source_mismatch'
  | 'unsafe_output'
  | 'unsupported_number'
  | 'unsupported_claim';

export interface TwinChatReply {
  response: string;
  session_id: string;
  topic: string;
  sources: TwinSource[];
  answer_mode: string;
  evidence: { source: string; quote: string }[];
  reply_kind: 'answer' | 'social' | 'insufficient_evidence' | 'declined';
  grounding_verified: boolean;
  grounding_method: 'deterministic';
  fallback_reason?: TwinFallbackReason;
}

type Intent = 'identity' | 'skills' | 'solutions' | 'projects' | 'experience' | 'education' | 'achievements' | 'contact';

interface KnowledgeDocument extends TwinSource {
  category: string;
  text: string;
  terms: Set<string>;
  aliases: string[];
  passages: KnowledgePassage[];
}

interface KnowledgePassage {
  section: string;
  text: string;
  terms: Set<string>;
}

interface Knowledge {
  documents: KnowledgeDocument[];
}

export class TwinError extends Error {
  readonly status: number;
  readonly code: string;
  readonly retryAfter?: number;

  constructor(status: number, code: string, message: string, retryAfter?: number) {
    super(message);
    this.name = 'TwinError';
    this.status = status;
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

const unavailable = () => new TwinError(503, 'unavailable', 'The Digital Twin is temporarily unavailable. Please try again shortly.');
const invalidInput = (message = 'Please send a valid chat message.') => new TwinError(400, 'invalid_request', message);
const invalidReply = () => new TwinError(502, 'invalid_response', 'The Digital Twin could not complete that reply. Please try again.');
const timeoutError = () => new TwinError(504, 'timeout', 'The Digital Twin took too long to respond. Please try again.');
const cancelled = () => new TwinError(499, 'cancelled', 'The request was cancelled.');
const guardrailError = (status = 403) => new TwinError(status, 'guardrail', 'Please ask about Yousef’s public portfolio, career, projects, or skills.');

function modelConfiguration(): { primary: GroqModel; models: GroqModel[] } {
  function select(value: string | undefined, defaultModel: GroqModel): GroqModel {
    const model = value?.trim() || defaultModel;
    if (model !== PRIMARY_MODEL && model !== FALLBACK_MODEL) {
      throw new TwinError(503, 'configuration', 'The Digital Twin is not configured correctly. Please try again later.');
    }
    return model;
  }
  const primary = select(process.env.GROQ_MODEL, PRIMARY_MODEL);
  const fallback = select(process.env.GROQ_MODEL_FALLBACK, FALLBACK_MODEL);
  return { primary, models: Array.from(new Set([primary, fallback])) };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validText(value: unknown, limit: number): value is string {
  return typeof value === 'string' && value.length <= limit && Boolean(value.trim())
    && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value);
}

export function validateChatInput(value: unknown): TwinChatInput {
  if (!isRecord(value) || !validText(value.message, MAX_MESSAGE_CHARS)) {
    throw invalidInput(`Please enter a message between 1 and ${MAX_MESSAGE_CHARS.toLocaleString('en-US')} characters.`);
  }
  if (Object.keys(value).some((key) => !['message', 'session_id', 'history', 'topic'].includes(key))) {
    throw invalidInput();
  }
  if (value.session_id !== undefined && (typeof value.session_id !== 'string'
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.session_id))) {
    throw invalidInput('Please start a new chat session.');
  }
  if (value.topic !== undefined && !validText(value.topic, MAX_TOPIC_CHARS)) {
    throw invalidInput('The conversation topic is invalid. Please start a new chat.');
  }
  if (value.history !== undefined && (!Array.isArray(value.history) || value.history.length > MAX_HISTORY_MESSAGES)) {
    throw invalidInput('The conversation history is invalid. Please start a new chat.');
  }

  const history: TwinHistoryEntry[] = [];
  let historyChars = 0;
  for (const item of (value.history ?? []) as unknown[]) {
    if (!isRecord(item) || Object.keys(item).some((key) => !['role', 'content'].includes(key))
      || (item.role !== 'user' && item.role !== 'assistant')
      || !validText(item.content, MAX_MESSAGE_CHARS)) {
      throw invalidInput('The conversation history is invalid. Please start a new chat.');
    }
    historyChars += item.content.length;
    if (historyChars > MAX_HISTORY_CHARS) {
      throw invalidInput('The conversation history is too long. Please start a new chat.');
    }
    history.push({ role: item.role, content: item.content.trim() });
  }

  if ([value.message, ...history.map((item) => item.content), value.topic]
    .some((text) => typeof text === 'string' && hasPromptInjection(text))) throw guardrailError();

  return {
    message: value.message.trim(),
    session_id: value.session_id as string | undefined,
    history,
    topic: typeof value.topic === 'string' ? value.topic.trim() : undefined,
  };
}

async function readBoundedJson(body: ReadableStream<Uint8Array> | null, limit: number, tooLarge: () => TwinError, signal?: AbortSignal): Promise<unknown> {
  if (!body) throw new SyntaxError('Missing JSON body');
  const reader = body.getReader();
  const cancelReading = () => { void reader.cancel().catch(() => { }); };
  signal?.addEventListener('abort', cancelReading, { once: true });
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let bytes = 0;
  let text = '';
  try {
    if (signal?.aborted) throw cancelled();
    for (; ;) {
      const { done, value } = await reader.read();
      if (signal?.aborted) throw cancelled();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > limit) throw tooLarge();
      text += decoder.decode(value, { stream: true });
    }
    return JSON.parse(text + decoder.decode()) as unknown;
  } catch (error) {
    void reader.cancel().catch(() => { });
    throw error;
  } finally {
    signal?.removeEventListener('abort', cancelReading);
    reader.releaseLock();
  }
}

export async function readChatInput(request: Request): Promise<TwinChatInput> {
  if (request.signal.aborted) throw cancelled();
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') ?? '')) {
    throw new TwinError(415, 'invalid_request', 'Please send the chat request as JSON.');
  }
  const tooLarge = () => new TwinError(413, 'invalid_request', 'The chat request is too large. Please start a new chat.');
  const length = Number(request.headers.get('content-length'));
  if (Number.isFinite(length) && length > MAX_REQUEST_BYTES) throw tooLarge();
  try {
    return validateChatInput(await readBoundedJson(request.body, MAX_REQUEST_BYTES, tooLarge, request.signal));
  } catch (error) {
    if (error instanceof TwinError) throw error;
    if (request.signal.aborted) throw cancelled();
    throw invalidInput('The chat request contains invalid JSON.');
  }
}

function normalize(text: string): string {
  return text.normalize('NFKC').toLowerCase().replace(/[\u064b-\u065f\u0670]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي');
}

function phrase(text: string): string {
  return normalize(text).match(/[\p{L}\p{N}]+/gu)?.join(' ') ?? '';
}

// Used only for portfolio navigation, after raw input has passed the security
// shield. Match the whole request so extra tasks cannot become authored facts.
function portfolioPhrase(message: string): string {
  return phrase(message).replace(/\bhis\b/g, 'your')
    .replace(/\bexper(?:ince|iance|infce)\b/g, 'experience')
    .replace(/\bhistroy\b/g, 'history')
    .replace(/^(?:(?:hi|hello|hey|please|okay|ok|well|so|then) )+/, '')
    .replace(/^(?:can|could|would|will) you(?: please)? /, '')
    .replace(/^please /, '').replace(/ please$/, '')
    .replace(/ (?:in english|in arabic)$/, '').replace(/ please$/, '');
}

const stopWords = new Set(('the and for what how why who are you your about tell does with can could would please have has did which that this them those these from explain more details primary main any give there where when work works doing using information me my is a an to in of on it do as i ما ماذا من كيف انت عنك عن لديك هل التي هذا ذلك المزيد ممكن او في لي انا مع هي هو علي اكثر اكتر').split(' '));

function queryTerms(text: string): Set<string> {
  const terms = new Set((normalize(text).match(/[\p{L}\p{N}]+/gu) ?? [])
    .filter((term) => !stopWords.has(term) && (term.length > 2 || ['ai', 'ml', 'r2', 'go'].includes(term))));
  for (const term of Array.from(terms)) {
    if (term.length > 4 && term.endsWith('s')) terms.add(term.slice(0, -1));
  }
  return terms;
}

function documentPassages(text: string, title: string): KnowledgePassage[] {
  const sections: { section: string; text: string }[] = [];
  let section = title;
  let lines: string[] = [];
  let frontmatter = false;
  const flush = () => {
    const block = lines.join('\n').trim();
    if (block && !/^#{1,6}\s+[^\n]+$/.test(block)) sections.push({ section, text: block });
    lines = [];
  };
  for (const [index, line] of text.replace(/\r\n?/g, '\n').split('\n').entries()) {
    if (line.trim() === '---' && (index === 0 || frontmatter)) {
      flush();
      frontmatter = !frontmatter;
      section = title;
      continue;
    }
    const heading = frontmatter ? line.match(/^([A-Za-z][\w-]*):/) : line.match(/^#{1,6}\s+(.+)/);
    if (heading) {
      flush();
      section = heading[1].replace(/_/g, ' ').slice(0, 160);
    }
    if (!line.trim()) flush();
    else lines.push(line);
  }
  flush();

  const passages: KnowledgePassage[] = [];
  for (const block of sections) {
    let start = 0;
    while (start < block.text.length) {
      let end = Math.min(start + 1_000, block.text.length);
      if (end < block.text.length) {
        const lineEnd = block.text.lastIndexOf('\n', end);
        const wordEnd = block.text.lastIndexOf(' ', end);
        if (lineEnd > start + 300) end = lineEnd;
        else if (wordEnd > start + 300) end = wordEnd;
      }
      const excerpt = block.text.slice(start, end).trim();
      if (excerpt) passages.push({ section: block.section, text: excerpt, terms: queryTerms(`${block.section}\n${excerpt}`) });
      if (end === block.text.length) break;
      start = Math.max(start + 1, end - 160);
    }
  }
  return passages;
}

function matchedExcerpt(document: KnowledgeDocument, terms: Set<string>, limit: number): string {
  if (document.text.length <= limit) return document.text;
  const ranked = document.passages.map((passage, order) => {
    const overlap = Array.from(terms).filter((term) => passage.terms.has(term)).length;
    const headingTerms = queryTerms(passage.section);
    const headingOverlap = Array.from(terms).filter((term) => headingTerms.has(term)).length;
    return { passage, order, overlap, score: overlap * 4 + headingOverlap * 2 + overlap / Math.max(1, passage.text.length / 300) };
  }).filter(({ overlap }) => overlap > 0).sort((a, b) => b.score - a.score || a.order - b.order);

  const selected: string[] = [];
  let remaining = limit;
  for (const { passage } of ranked) {
    const block = `[Section: ${passage.section}]\n${passage.text}`;
    if (block.length + (selected.length ? 2 : 0) > remaining) continue;
    selected.push(block);
    remaining -= block.length + (selected.length > 1 ? 2 : 0);
    if (selected.length === 4 || remaining < 100) break;
  }
  return selected.length ? selected.join('\n\n') : document.text.slice(0, limit);
}

let cachedKnowledge: Knowledge | undefined;

function readKnowledgeFile(filePath: string, limit: number): string {
  if (fs.statSync(filePath).size > limit) throw new Error('Knowledge file exceeds its bound');
  return fs.readFileSync(filePath, 'utf8').trim();
}

function loadKnowledge(): Knowledge {
  if (cachedKnowledge) return cachedKnowledge;
  try {
    const root = process.cwd();
    const dataRoot = path.join(root, 'data', 'twin');
    const facts = JSON.parse(readKnowledgeFile(path.join(dataRoot, 'facts.json'), 32_000)) as unknown;
    if (!isRecord(facts)) throw new Error('Invalid portfolio facts');
    const compactFacts = JSON.stringify(facts);
    const summary = readKnowledgeFile(path.join(dataRoot, 'summary.txt'), 12_000);
    const style = readKnowledgeFile(path.join(dataRoot, 'style.txt'), 6_000);
    if (!summary || !style || compactFacts.length > 7_000 || summary.length > 3_000 || style.length > 1_500) {
      throw new Error('Invalid persona knowledge');
    }
    if ([compactFacts, summary, style].some(hasPromptInjection)) throw new Error('Unsafe persona knowledge');

    const documents: KnowledgeDocument[] = [];
    const contentRoot = path.join(root, 'content');
    for (const folder of ['', 'projects', 'certifications']) {
      const directory = path.join(contentRoot, folder);
      for (const filename of fs.readdirSync(directory).sort()) {
        if (!filename.endsWith('.md') || filename.toLowerCase() === 'readme.md') continue;
        if (documents.length >= MAX_DOCUMENTS) throw new Error('Too many portfolio documents');
        const source = [folder, filename].filter(Boolean).join('/');
        const raw = readKnowledgeFile(path.join(directory, filename), MAX_DOCUMENT_BYTES);
        // Quarantine whole documents before excerpting, including their metadata.
        if (hasPromptInjection(raw)) continue;
        const document = parseMarkdown(raw, source);
        const title = typeof document.data.title === 'string' ? document.data.title : document.slug;
        const text = raw;
        const aliases = [phrase(title), phrase(document.slug)];
        const shortName = phrase(document.slug).split(' ')[0];
        if (['r2', 'sdr', 'atmega32'].includes(shortName)) aliases.push(shortName);
        documents.push({ source, title, text, category: folder || filename.slice(0, -3), terms: queryTerms(`${title}\n${text}`), aliases, passages: documentPassages(text, title) });
      }
    }
    if (!documents.length) throw new Error('Missing portfolio documents');

    cachedKnowledge = { documents };
    return cachedKnowledge;
  } catch {
    throw new TwinError(503, 'knowledge_unavailable', 'The Digital Twin’s portfolio knowledge is temporarily unavailable. Please try again later.');
  }
}

function namedProjects(message: string, documents: KnowledgeDocument[]): KnowledgeDocument[] {
  const words = ` ${phrase(message)} `;
  return documents.filter((document) => document.category === 'projects'
    && document.aliases.some((alias) => alias && words.includes(` ${alias} `)));
}

function queryIntent(message: string, documents: KnowledgeDocument[]): Intent | undefined {
  const words = portfolioPhrase(message);
  if (overviewTopics.Background.test(words) || overviewTopics['More About You'].test(words)
    || overviewTopics.Profile.test(words)) return 'identity';
  if (namedProjects(message, documents).length) return 'projects';
  if (/\b(arche|dynamodb|lambda|fastmcp|fleet)\b/.test(words)) return 'experience';
  if (/\b(certificates?|certifications?|certified|courses?|education|degrees?|university)\b|شهاد|دورات|تعليم|جامع|دراست/.test(words)) return 'education';
  if (/\b(contact|email|linkedin|available|availability|hire)\b|تواصل|ايميل|بريد|توظيف/.test(words)) return 'contact';
  if (/\b(achievements?|awards?|accomplishments?)\b|انجاز|جوائز/.test(words)) return 'achievements';
  if (/\b(skills?|stack|specialties|expertise|technologies|technology|tools|languages|rag|qlora|pytorch|python|langchain|n8n|mcp)\b|مهار|ادوات|تقنيات|تكنولوج/.test(words)) return 'skills';
  if (/\b(build|building|develop|developing|development|automate|automating|automation|workflows?|implement|design|solutions?|agents?)\b|تطوير|تطوي|حلول|اتمت|وكلاء/.test(words)) return 'solutions';
  if (/\b(projects?|applications?)\b|مشاريع|مشروعات|تطبيقات/.test(words)) return 'projects';
  if (/\b(experience|career|employment|employers?|work|worked|roles?|jobs?|ischool|outlier)\b|خبر|وظائف|عملت/.test(words)) return 'experience';
  if (/^(hi|hello|hey|مرحبا|اهلا|السلام عليكم)$/.test(words)
    || /\b(who are you|who is yousef|your name|what do you do|about yourself|introduce yourself|background|biography|your profile)\b|من انت|عرفني بنفسك|اسمك|عن نفسك/.test(words)) return 'identity';
  return undefined;
}

function isFollowup(message: string, documents: KnowledgeDocument[]): boolean {
  const words = portfolioPhrase(message);
  return /^(?:(?:tell me|explain|show me|say) )?(?:more|more details|elaborate|expand|continue|go on)(?: a bit| a little| more)?$/.test(words)
    || /\b(it|that|this|them|those|these|there)\b/.test(words)
    || /^(ممكن )?(توضح|وضح|اشرح|احكي لي|قول لي)? ?(اكثر|اكتر|المزيد)$|^كمل$|عن (هذا|ذلك|ده)|المشروع ده/.test(words)
    || (words.startsWith('and ') && !queryIntent(message, documents));
}

export function resolveChatTopic(input: TwinChatInput): string {
  const { documents } = loadKnowledge();
  const followup = isFollowup(input.message, documents);
  const explicitIntent = queryIntent(input.message, documents);
  const contextual = /\b(it|that|this|them|those|these|there)\b|هذا|ذلك|المشروع ده/.test(phrase(input.message));
  if (!followup || (explicitIntent && !contextual)) return input.message.slice(0, MAX_TOPIC_CHARS);
  if (input.topic) return input.topic;
  for (const item of input.history.slice().reverse()) {
    if (item.role === 'user' && !isFollowup(item.content, documents)) return item.content.slice(0, MAX_TOPIC_CHARS);
  }
  return input.message.slice(0, MAX_TOPIC_CHARS);
}

const intentCategories: Record<Intent, string[]> = {
  identity: ['about', 'profile', 'resume'],
  skills: ['expertise', 'resume', 'about', 'experience', 'projects'],
  solutions: ['expertise', 'about', 'resume', 'experience', 'projects'],
  projects: ['projects', 'expertise'],
  experience: ['experience', 'resume', 'about', 'achievements'],
  education: ['certifications', 'resume', 'about', 'achievements'],
  achievements: ['achievements', 'experience', 'projects'],
  contact: ['profile', 'about', 'resume'],
};

const overviewTopics: Record<string, RegExp> = {
  Projects: /^(?:(?:tell me about|show me|list|what are) )?(?:your )?(?:main |key |highlighted )?(?:projects|portfolio)(?: please)?$|^what projects have you (?:built|worked on)$|^(?:مشاريع|مشاريعي|مشاريعك|وريني مشاريعك|ايه مشاريعك|كلمنا عن مشاريعك)$/,
  Profile: /^(?:profile|about you|about yourself|who are you|who is yousef|tell me about (?:you|yourself)|introduce yourself|where are you based|what is your full name|what s your name|what is your name|tell me your name|what do you do|من انت|انت مين|عرفني بنفسك|احكيلي عن نفسك|عن نفسك|اسمك ايه)$/,
  'More About You': /^(?:(?:tell me|share|explain) )?more about (?:you|yourself)$|^(?:احكيلي اكتر عن نفسك|قول لي اكتر عن نفسك)$/,
  Background: /^(?:(?:tell me about|what is|describe|share|explain) )?(?:your )?(?:history|background|biography|professional background|professional history|professional journey)$|^(?:احكيلي عن بدايتك|بدايتك|خلفيتك المهنية)$/,
  Motivation: /^(?:why did you choose ai|why ai|what got you into ai|how did you get into ai|why do you like ai|ليه اخترت ai|ليه الذكاء الاصطناعي|ايه اللي دخلك مجال ai)$/,
  'Current Focus': /^(?:what are you working on now|what are you currently working on|what are you working on|what is your current focus|what do you work on now|بتشتغل على ايه دلوقتي|بتعمل ايه حاليًا|تركيزك الحالي ايه)$/,
  Skills: /^(?:(?:tell me about|show me|list|what are) )?(?:your )?(?:skills|tools|stack|tech stack|technologies|(?:programming )?languages)(?: do you (?:know|use|code in))?$|^what (?:ai )?tools do you use$|^(?:مهارات|مهاراتك|ادواتك|ايه مهاراتك|لغات البرمجة|ايه لغات البرمجة اللي تعرفها)$/,
  Career: /^(?:(?:tell me about|what is|speak on|talk about|discuss) )?(?:your )?(?:career|experience|work|work history)$|^(?:خبرتك|شغلك|خبراتك|احكيلي عن شغلك)$/,
  Education: /^(?:(?:tell me about|what is) )?(?:your )?education$|^(?:تعليمك|دراستك)$/,
  Certifications: /^(?:(?:tell me about|list|what are) )?(?:your )?(?:certifications|certificates)$|^what certifications do you have$|^(?:شهاداتك|شهادات|ما هي شهاداتك)$/,
  Contact: /^(?:contact|email|linkedin|github|resume|cv|your email|how can i contact you|how can i reach you|تواصل|ايميلك|ازاي اتواصل معاك)$/,
};

function personalReply(message: string, knowledge: Knowledge): Pick<TwinChatReply, 'response' | 'sources' | 'evidence' | 'reply_kind'> | undefined {
  const words = portfolioPhrase(message);
  const ageQuestion = /^(?:how old are you|what s your age|what is your age|tell me your age|how old is yousef|what is yousef s age|age|your age|سنك|عمرك|عنده كام سنة|عندك كام سنة)$/u.test(words);
  if (ageQuestion) {
    return {
      response: replyLanguage(message) === 'ar'
        ? 'عمري مش مذكور في ملفي المهني العام، بس يسعدني أحكيلك عن دراستي وخبرتي ومشاريعي في AI.'
        : "I don't share an age in my public professional profile, but I'm happy to talk about my education, experience, projects, or AI engineering work.",
      sources: [],
      evidence: [],
      reply_kind: 'insufficient_evidence',
    };
  }
  const phoneQuestion = /^(?:(?:what|whats|what s) (?:is|s) your (?:phone|mobile|cell|contact|whatsapp) number|your (?:phone|mobile|cell|contact|whatsapp) number|what is your contact number|phone number|رقمك|رقمك ايه|ايه رقمك|ماهو رقمك|ما هو رقمك|رقم تليفونك|رقم تليفونك ايه|رقم موبايلك|رقم موبايلك ايه|رقم هاتفك|رقم هاتفك ايه|رقم الواتس|رقم الواتساب)$/u.test(words);
  if (phoneQuestion) {
    const document = knowledge.documents.find((item) => item.source === 'digital-twin.md');
    const answer = document ? authoredAnswer(document, ['Phone'], replyLanguage(message)) : undefined;
    if (answer) return { ...answer, reply_kind: 'answer' };
  }
  const personalQuestion = /^(?:(?:when|what year) (?:were you|was yousef) born|birth ?date|birthday|when is your birthday|what are your hobbies|what do you do in your free time|free time|hobbies|هواياتك|هواياتك ايه|بتحب ايه في وقت فراغك|اتولدت امتى|مواليد سنة كام|تاريخ ميلادك|عيد ميلادك امتى)$/u.test(words);
  if (personalQuestion) {
    const document = knowledge.documents.find((item) => item.source === 'digital-twin.md');
    const answer = document ? authoredAnswer(document, ['Personal'], replyLanguage(message)) : undefined;
    if (answer) return { ...answer, reply_kind: 'answer' };
  }
  const nameQuestion = /^(?:what s your name|what is your name|tell me your name|who is yousef|اسمك|اسم يوسف|مين يوسف)$/u.test(words);
  if (!nameQuestion) return;
  const document = knowledge.documents.find((item) => item.source === 'digital-twin.md');
  const answer = document ? authoredAnswer(document, ['Profile'], replyLanguage(message)) : undefined;
  return answer ? { ...answer, reply_kind: 'answer' } : undefined;
}

function portfolioOverview(message: string, knowledge: Knowledge): Pick<TwinChatReply, 'response' | 'sources' | 'evidence'> | undefined {
  const words = portfolioPhrase(message);
  const section = Object.keys(overviewTopics).find((name) => overviewTopics[name].test(words));
  const document = knowledge.documents.find((item) => item.source === 'digital-twin.md');
  if (!section || !document) return;
  const names = section === 'Background' ? ['Motivation', 'Education', 'Career']
    : section === 'More About You' ? ['Profile', 'Motivation', 'Current Focus']
      : [section, ...(['Projects', 'Profile'].includes(section) ? ['Contact'] : [])];
  return authoredAnswer(document, names, replyLanguage(message));
}

function authoredAnswer(document: KnowledgeDocument, names: string[], language: 'en' | 'ar'): Pick<TwinChatReply, 'response' | 'sources' | 'evidence'> | undefined {
  const blocks = document.text.replace(/\r\n?/g, '\n').split(/^# ([^\n]+)\n/gm);
  const sections = new Map<string, string>();
  for (let i = 1; i + 1 < blocks.length; i += 2) sections.set(blocks[i].trim(), blocks[i + 1].trim());
  const quotes = names.map((name) => sections.get(`${name} (${language})`));
  if (quotes.some((quote) => !quote || quote.length > 900)) return;
  const evidence = (quotes as string[]).map((quote) => ({ source: document.source, quote }));
  const response = evidence.map((item) => item.quote).join('\n\n');
  // These are authored first-person answers with exact canonical evidence, so
  // basic portfolio navigation does not depend on a provider or its quota.
  if (response.length > 2500 || !isSafeReply(response, response, process.env.GROQ_API_KEY)
    || !hasSupportedNumbers(response, evidence)) return;
  return { response, evidence, sources: [{ source: document.source, title: document.title }] };
}

function factualRecovery(message: string, topic: string, knowledge: Knowledge): ReturnType<typeof authoredAnswer> {
  const words = phrase(message);
  const arche = /\barche robotics\b/.test(phrase(`${topic} ${message}`));
  const toolsQuestion = /^(?:(?:can|could|would) you )?(?:please )?(?:elaborate on|tell me about|explain|describe) (?:the |your )?(?:ai )?(?:tools|technologies|tech stack|work)(?: you use)?(?: there| at arche robotics)?$/.test(words)
    || /^(?:what|which) (?:ai )?(?:tools|technologies) do you use(?: there| at arche robotics)?$/.test(words)
    || /^(?:tell me about (?:your )?work at arche robotics)$/.test(words)
    || /^(?:بتستخدم ايه في شغلك|ايه ادواتك|ما هي ادواتك|احكيلي عن شغلك)(?: في arche robotics)?$/.test(words);
  const graduation = /^(?:was|is) your (?:r2 waiter )?(?:graduation|final year) (?:service )?robot ros1 or ros2(?: and what hardware did it use)?$/.test(words)
    || /^(?:what|which) (?:hardware|ros version|sensors) (?:did|does) your (?:r2 waiter )?(?:graduation|final year) (?:service )?robot use$/.test(words)
    || /^(?:tell me about (?:your )?r2[- ]waiter(?: project)?)$/i.test(words)
    || /^(?:روبوت التخرج كان ros1 ولا ros2|ايه الهاردوير اللي استخدمته في روبوت التخرج|احكيلي عن مشروع r2[- ]waiter|كلمني عن r2[- ]waiter)$/.test(words);
  const target = arche && toolsQuestion ? { source: 'experience.md', section: 'Arche Robotics tools' }
    : graduation ? { source: 'achievements.md', section: 'Graduation answer' } : undefined;
  if (!target) return;
  const document = knowledge.documents.find((item) => item.source === target.source);
  if (document) return authoredAnswer(document, [target.section], replyLanguage(message));
}

function retrieve(input: TwinChatInput, topic: string, knowledge: Knowledge): { context: string; sources: TwinSource[] } {
  const query = topic === input.message ? input.message : `${topic}\n${input.message}`;
  const projects = namedProjects(query, knowledge.documents);
  const graduationScope = /\b(graduation|final year)\b|تخرج/.test(phrase(query))
    || (/\b(robot|robotics|r2 waiter)\b|روبوت/.test(phrase(query)) && /\b(lidar|jetson|realsense|hardware|sensors)\b/.test(phrase(query)));
  const graduationSources = graduationScope ? knowledge.documents.filter((document) => document.passages.some((passage) => {
    if (!/\b(graduation|final year)\b|تخرج/.test(phrase(`${passage.section}\n${passage.text}`))) return false;
    if (!projects.length) return true;
    const related = namedProjects(passage.text, knowledge.documents);
    return projects.some((project) => related.includes(project));
  })) : [];
  const intent = graduationSources.length ? 'achievements' : projects.length ? 'projects' : queryIntent(topic, knowledge.documents) ?? queryIntent(input.message, knowledge.documents);
  const categories = intent ? intentCategories[intent] : undefined;
  const terms = queryTerms(query);
  const ranked = knowledge.documents.map((document) => {
    const overlap = Array.from(terms).filter((term) => document.terms.has(term)).length;
    const titleOverlap = Array.from(terms).filter((term) => queryTerms(document.title).has(term)).length;
    // Graduation records take precedence over a similarly named repository.
    const priority = graduationSources.length
      ? graduationSources.includes(document)
        ? document.category === 'achievements' ? 0 : 1
        : 2
      : categories?.indexOf(document.category) ?? 0;
    return { document, overlap, score: overlap + titleOverlap * 3, priority };
  }).filter(({ document, overlap, priority }) => {
    if (graduationSources.length) return graduationSources.includes(document) || projects.includes(document);
    if (projects.length) return projects.includes(document);
    return categories ? priority >= 0 : overlap > 0;
  }).sort((a, b) => a.priority - b.priority || b.score - a.score || a.document.source.localeCompare(b.document.source));

  const blocks: string[] = [];
  const sources: TwinSource[] = [];
  let remaining = MAX_CONTEXT_CHARS;
  for (const { document } of ranked.slice(0, 8)) {
    const prefix = `[Source: ${document.source} | Title: ${document.title}]\n`;
    const available = Math.min(2_400, remaining - prefix.length - 2);
    if (available < 100) break;
    const block = prefix + matchedExcerpt(document, terms, available);
    blocks.push(block);
    remaining -= block.length + 2;
    sources.push({ source: document.source, title: document.title });
  }
  return { context: blocks.join('\n\n'), sources };
}

function fallbackAllowed(status: number, body: unknown): boolean {
  if (status === 429) return true;
  if (![400, 404, 410, 422].includes(status) || !isRecord(body) || !isRecord(body.error)) return false;
  const code = typeof body.error.code === 'string' ? body.error.code.toLowerCase() : '';
  if (['model_not_found', 'model_decommissioned', 'model_retired', 'unsupported_model', 'model_not_supported'].includes(code)) return true;
  const message = typeof body.error.message === 'string' ? body.error.message.toLowerCase() : '';
  return /\bmodel(?:\s+["'`]?[\w./:-]+["'`]?)?\s+(?:(?:has been|is|was)\s+)?(?:currently\s+)?(?:decommissioned|retired|no longer supported|not supported|unsupported|does not exist|not found)\b/.test(message)
    || /\b(?:unsupported|retired|decommissioned)\s+model\b/.test(message);
}

function providerError(status: number, retryAfter?: string | null): TwinError {
  if (status === 401 || status === 403) return new TwinError(503, 'configuration', 'The Digital Twin is not configured correctly. Please try again later.');
  if (status === 429) {
    const seconds = retryAfter && /^\d+(?:\.\d+)?$/.test(retryAfter)
      ? Number(retryAfter) : retryAfter ? (Date.parse(retryAfter) - Date.now()) / 1000 : NaN;
    return new TwinError(429, 'rate_limit', 'Please give me a moment, then try again.',
      Number.isFinite(seconds) ? Math.max(0, Math.ceil(seconds)) : undefined);
  }
  if (status === 408 || status === 504) return timeoutError();
  return unavailable();
}

export async function chatWithTwin(input: TwinChatInput, requestSignal?: AbortSignal,
  diagnostics?: { onClaimValidation: (validation: ClaimValidation) => void }): Promise<TwinChatReply> {
  const started = Date.now();
  const telemetry: Record<string, string | number | boolean> = {
    event: 'twin_turn', grounding_method: 'deterministic', provider_calls: 0,
    prompt_tokens: 0, completion_tokens: 0, rate_limits: 0,
  };
  const finish = (reply: TwinChatReply, reason: string): TwinChatReply => {
    console.info(JSON.stringify({ ...telemetry, latency_ms: Date.now() - started,
      reply_kind: reply.reply_kind, reason }));
    return reply;
  };
  if (requestSignal?.aborted) throw cancelled();
  input = validateChatInput(input);
  const { primary, models } = modelConfiguration();
  if (hasPromptInjection(input.message) || (input.topic && hasPromptInjection(input.topic))
    || input.history.some((item) => hasPromptInjection(item.content))) {
    throw guardrailError(403);
  }
  telemetry.language = replyLanguage(input.message);
  const knowledge = loadKnowledge();
  const topic = resolveChatTopic(input);
  const aliases = knowledge.documents.filter((document) => document.category === 'projects').flatMap((document) => document.aliases);
  const scoped = hasPortfolioScope(input.message, aliases, topic === input.message ? undefined : topic);
  const emptyReply = (response: string, reply_kind: 'social' | 'insufficient_evidence' | 'declined'): TwinChatReply => ({
    response, session_id: input.session_id ?? randomUUID(), topic, sources: [],
    answer_mode: guardrailAnswerMode, evidence: [], reply_kind, grounding_verified: false, grounding_method: 'deterministic',
  });
  const social = socialReply(input.message);
  if (social) return finish(emptyReply(social, 'social'), 'social');
  const personal = personalReply(input.message, knowledge);
  if (personal) return finish({ ...personal, session_id: input.session_id ?? randomUUID(), topic,
    answer_mode: guardrailAnswerMode, grounding_verified: personal.reply_kind === 'answer',
    grounding_method: 'deterministic' }, 'personal_profile');
  const overview = portfolioOverview(input.message, knowledge);
  if (overview) return finish({ ...overview, session_id: input.session_id ?? randomUUID(), topic,
    answer_mode: guardrailAnswerMode, reply_kind: 'answer', grounding_verified: true,
    grounding_method: 'deterministic' }, 'portfolio_overview');
  const followupIntent = isFollowup(input.message, knowledge.documents);
  if (followupIntent && queryIntent(topic, knowledge.documents) === 'identity') {
    const document = knowledge.documents.find((item) => item.source === 'digital-twin.md');
    const recovery = document ? authoredAnswer(document, ['Motivation', 'Education', 'Current Focus'], replyLanguage(input.message)) : undefined;
    if (recovery) return finish({ ...recovery, session_id: input.session_id ?? randomUUID(), topic,
      answer_mode: guardrailAnswerMode, reply_kind: 'answer', grounding_verified: true,
      grounding_method: 'deterministic' }, 'followup_overview');
  }
  const { context, sources } = retrieve(input, topic, knowledge);
  const candidates = portfolioEvidence(context, `${topic} ${input.message}`);
  const fallbackReply = (reason: TwinFallbackReason) => {
    // A rejected draft cannot establish facts. Recognized factual questions may
    // instead use an independent, authored answer from the canonical portfolio.
    const recovery = factualRecovery(input.message, topic, knowledge);
    if (recovery) {
      telemetry.draft_rejection = reason;
      return finish({ ...recovery, session_id: input.session_id ?? randomUUID(), topic,
        answer_mode: guardrailAnswerMode, reply_kind: 'answer', grounding_verified: true,
        grounding_method: 'deterministic' }, 'authored_recovery');
    }
    return finish({ ...emptyReply(
      scoped ? noEvidenceReply(input.message) : declineReply(input.message),
      scoped ? 'insufficient_evidence' : 'declined',
    ), fallback_reason: reason }, reason);
  };
  const rejectDraft = (reason: TwinFallbackReason) => fallbackReply(reason);
  const key = process.env.GROQ_API_KEY?.trim();
  if (!key && !candidates.length) return fallbackReply('no_candidates');
  if (!key) throw new TwinError(503, 'configuration', 'The Digital Twin is not configured yet. Please try again later.');
  // Resolve references for retrieval; previous answers never enter generation.
  const envelope = JSON.stringify({
    evidence_candidates: candidates, topic, question: input.message,
    requested_language: replyLanguage(input.message),
  });
  const responseFormat = portfolioResponseFormat(candidates);
  if (guardrailInstructions.length + envelope.length > MAX_SYSTEM_CHARS) throw unavailable();
  const messages = [{ role: 'system', content: guardrailInstructions }, { role: 'user', content: envelope }];
  telemetry.input_chars = guardrailInstructions.length + envelope.length;
  telemetry.candidate_count = candidates.length;
  const controller = new AbortController();
  let timedOut = false;
  let primaryLimited = false;
  const deadline = Date.now() + PROVIDER_DEADLINE_MS;
  const onCancel = () => controller.abort();
  requestSignal?.addEventListener('abort', onCancel, { once: true });
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, PROVIDER_DEADLINE_MS);

  try {
    for (const model of models) {
      const canTryFallback = model === primary && models.length > 1;
      if (controller.signal.aborted || Date.now() >= deadline) {
        if (!requestSignal?.aborted) timedOut = true;
        throw timedOut ? timeoutError() : cancelled();
      }
      telemetry.model = model;
      telemetry.provider_calls = Number(telemetry.provider_calls) + 1;
      const response = await fetch(GROQ_ENDPOINT, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        cache: 'no-store',
        signal: controller.signal,
        body: JSON.stringify({ model, messages, response_format: responseFormat, stream: false, temperature: 0, max_tokens: 1024, reasoning_effort: 'low' }),
      });
      if (response.status === 429) telemetry.rate_limits = Number(telemetry.rate_limits) + 1;
      let body: unknown;
      try {
        body = await readBoundedJson(response.body, MAX_PROVIDER_BYTES, invalidReply, controller.signal);
      } catch (error) {
        if (controller.signal.aborted) throw error;
        if (response.status === 429 && canTryFallback) {
          primaryLimited = true;
          continue;
        }
        if (!response.ok) throw providerError(response.status, response.headers.get('retry-after'));
        return rejectDraft('invalid_provider_json');
      }
      if (controller.signal.aborted || Date.now() >= deadline) {
        if (!requestSignal?.aborted) timedOut = true;
        throw timedOut ? timeoutError() : cancelled();
      }
      if (!response.ok) {
        // Groq can reject a generated draft even in strict schema mode. This is
        // an evidence-selection failure, not a network/configuration outage.
        if ([400, 422].includes(response.status) && isRecord(body) && isRecord(body.error)
          && body.error.code === 'json_validate_failed') return rejectDraft('invalid_selection');
        if (canTryFallback && fallbackAllowed(response.status, body)) {
          if (response.status === 429) primaryLimited = true;
          continue;
        }
        throw providerError(response.status, response.headers.get('retry-after'));
      }
      if (isRecord(body) && isRecord(body.usage)) {
        for (const field of ['prompt_tokens', 'completion_tokens']) {
          const count = body.usage[field];
          if (typeof count === 'number' && Number.isFinite(count) && count >= 0) {
            telemetry[field] = Number(telemetry[field]) + count;
          }
        }
      }
      const first = isRecord(body) && Array.isArray(body.choices) ? body.choices[0] : undefined;
      const content = isRecord(first) && isRecord(first.message) ? first.message.content : undefined;
      if (isRecord(first) && first.finish_reason === 'length') return rejectDraft('truncated_completion');
      if (isRecord(first) && first.finish_reason === 'content_filter') return rejectDraft('provider_content_filter');
      if (isRecord(first) && isRecord(first.message) && (first.message.tool_calls || first.message.function_call)) return rejectDraft('unexpected_tool_call');
      if (!first || typeof content !== 'string' || !content.trim() || content.length > MAX_RESPONSE_CHARS) return rejectDraft('empty_completion');
      let proposed: ReturnType<typeof parsePortfolioAnswer> | undefined;
      try { proposed = parsePortfolioAnswer(content, candidates); } catch { return rejectDraft('invalid_selection'); }
      if (!proposed) return rejectDraft('invalid_selection');
      const { answer } = proposed;
      if (!scoped || !proposed.selected.length) {
        // The same call can produce an honest clarification or a friendly pivot.
        // Such dialogue is never represented as a verified portfolio claim.
        if (isConversationalReply(answer, input.message, key)) {
          return finish(emptyReply(answer, scoped ? 'insufficient_evidence' : 'declined'), 'model_missing_evidence');
        }
        return rejectDraft('model_missing_evidence');
      }
      const selected = completeEvidenceSelection(answer, proposed.selected, candidates, input.message, key);
      const evidence = selected.map(({ source, quote }) => ({ source, quote }));
      for (const item of evidence) {
        const doc = knowledge.documents.find((d) => d.source === item.source);
        if (!doc || !doc.text.replace(/\r\n?/g, '\n').includes(item.quote)) return rejectDraft('source_mismatch');
      }
      if (!isSafeReply(answer, evidence.map((item) => item.quote).join('\n'), key)) return rejectDraft('unsafe_output');
      if (!hasSupportedNumbers(answer, evidence)) return rejectDraft('unsupported_number');
      const claim = inspectSupportedClaims(answer, evidence, input.message);
      if (diagnostics?.onClaimValidation) diagnostics.onClaimValidation(claim);
      if (!claim.supported) return rejectDraft('unsupported_claim');
      const used = new Set(evidence.map((item) => item.source));
      return finish({
        response: answer,
        session_id: input.session_id ?? randomUUID(),
        topic,
        sources: sources.filter((source) => used.has(source.source)),
        answer_mode: guardrailAnswerMode,
        evidence,
        reply_kind: 'answer',
        grounding_verified: true,
        grounding_method: 'deterministic',
      }, 'validated');
    }
    throw primaryLimited ? providerError(429) : unavailable();
  } catch (error) {
    if (timedOut || (!requestSignal?.aborted && Date.now() >= deadline)) throw timeoutError();
    if (requestSignal?.aborted) throw cancelled();
    if (error instanceof TwinError) throw error;
    throw unavailable();
  } finally {
    clearTimeout(timer);
    requestSignal?.removeEventListener('abort', onCancel);
  }
}

export function getTwinHealth() {
  const { primary } = modelConfiguration();
  const knowledge = loadKnowledge();
  return {
    status: 'healthy' as const,
    llm_configured: Boolean(process.env.GROQ_API_KEY?.trim()),
    rag_documents: knowledge.documents.length,
    provider: 'groq' as const,
    model: primary,
    guardrail_policy: guardrailPolicyVersion,
    answer_mode: guardrailAnswerMode,
    grounding_method: 'deterministic' as const,
  };
}

export function twinErrorResponse(error: unknown): Response {
  const safe = error instanceof TwinError ? error : unavailable();
  return Response.json({ code: safe.code, error: safe.message }, { status: safe.status, headers: {
    'Cache-Control': 'no-store', ...(safe.retryAfter !== undefined ? { 'Retry-After': String(safe.retryAfter) } : {}),
  } });
}
