import { CaseStudy, CaseStudySchema } from '../schemas';

// Real production incidents from this monorepo's own history, not hypothetical
// examples. Each one names either a real guardrail id (verified against
// scripts/harness-status.mjs's GUARDRAILS array in caseStudiesData.test.ts) or
// another concrete enforcement mechanism whose file is verified to exist on
// disk — the same "citation, not decoration" discipline the code snippets and
// ML pipeline steps follow elsewhere in this dataset.
const RAW_CASE_STUDIES: CaseStudy[] = [
  {
    id: 'enum-blast-radius',
    title: 'A Widened Enum Silently Broke Three Files Nobody Opened',
    problem:
      'A pull request added a new member to a shared Zod-inferred type (CareTypeSchema). The PR opened two of that type\'s seven consumers in the app.',
    rootCause:
      'A Record<CareType, …> lookup table and a UI dropdown built from Object.keys() were both exhaustive over the old member set, and TypeScript only catches the subset of exhaustiveness violations that are structurally typed — a Record miss and a runtime .toLowerCase() on an undefined label are not compile errors.',
    fix:
      'The remaining five consumers were opened and fixed: a cost-data lookup table (type-check failure that blocked next build entirely), a methodology panel that crashed at runtime on the new member, and a dropdown that had silently gained an option with no way to price it.',
    enforcedBy: 'scripts/check-enum-blast-radius.mjs',
    sourceRef: '.agents/AGENTS.md §9.2',
  },
  {
    id: 'no-op-assertion',
    title: 'A Drift Tripwire That Could Never Trip',
    problem:
      'A test meant to catch schema drift read: `const _: typeof PlanSchema = undefined as unknown as typeof PlanSchema;`, introduced as a "tripwire" that would flag a future change to Plan.',
    rootCause:
      'The annotation and the cast are the same type, so the line is a tautology in type space — no possible change to Plan can make it fail. It is not weak coverage; it is a false statement about what is covered.',
    fix:
      'The line was replaced with an assertion capable of failing, and a guardrail now blocks the shape itself repo-wide — an expect() with no matcher chained onto it, or a value cast back to its own type — before either can merge again.',
    guardrailId: 'no-op-assertion',
    sourceRef: '.agents/AGENTS.md §6 "Prove a New Test Can Fail" / §9.4',
  },
  {
    id: 'capacitor-absolute-base',
    title: 'A Correct Web Build Shipped a Blank Android App',
    problem:
      'An app\'s bundler config hardcoded its GitHub Pages deploy subpath as the base path. Web CI, Playwright, and the live Pages deploy all stayed green — and the same build, packaged into its Capacitor Android container, booted to a blank white screen.',
    rootCause:
      'Capacitor serves the bundle from https://localhost/ inside the Android WebView, so every asset URL prefixed with the Pages subpath 404s. The configuration is correct for one deploy target and fatal for the other, and nothing in the web test suite can see the difference because it never runs against the WebView origin.',
    fix:
      'Switched the base to a relative "./", which resolves correctly under both the Pages subpath and the WebView origin. The guardrail scopes itself to apps that actually ship a capacitor.config so a web-only app\'s absolute subpath base — the correct answer there — is never flagged.',
    guardrailId: 'capacitor-absolute-base',
    sourceRef: '.agents/AGENTS.md §6 "Capacitor Absolute Base Path"',
  },
  {
    id: 'pbkdf2-salt-buffer',
    title: 'A WebCrypto Call That Worked in the Browser and Crashed in Node',
    problem:
      'Key derivation passed a TypedArray\'s raw .buffer as the PBKDF2 salt to subtle.deriveKey(...). It worked in every browser and threw TypeError: \'salt\' of \'Pbkdf2Params\' is not instance of ArrayBuffer under Node 20\'s WebCrypto bindings.',
    rootCause:
      'The two runtimes accept different views over the same underlying bytes, and TypeScript\'s BufferSource typing does not distinguish the safe case from the unsafe one — the code type-checked cleanly in both places.',
    fix:
      'Passing a fresh new Uint8Array(saltBytes) instead of the raw buffer works identically in both runtimes. The guardrail now flags any salt*.buffer reference before it ships, so the fix generalizes past the one call site that surfaced it.',
    guardrailId: 'pbkdf2-salt-buffer',
    sourceRef: '.agents/AGENTS.md §6 "Node WebCrypto TypedArray Buffer Normalization"',
  },
];

export const CASE_STUDIES: CaseStudy[] = RAW_CASE_STUDIES.map((study) => CaseStudySchema.parse(study));
