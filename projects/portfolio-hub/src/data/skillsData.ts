import { Skill, SkillSchema } from '../schemas';
import { PROJECTS_DATA } from './projectsData';

// Evidence strings are derived from the same PROJECTS_DATA every card renders
// from, rather than hand-typed counts, so a claim here can't drift out of
// sync with the dataset the way a second, independent tally could
// (.agents/AGENTS.md §6, "One Fact Stated Twice Will Eventually Be Stated
// Two Ways").
const totalUnitTests = PROJECTS_DATA.reduce((sum, p) => sum + p.metrics.unitTests, 0);
const totalE2eTests = PROJECTS_DATA.reduce((sum, p) => sum + p.metrics.e2eTests, 0);
const pwaCount = PROJECTS_DATA.filter((p) => p.pwaReady).length;
const androidCount = PROJECTS_DATA.filter((p) => p.capacitorAndroid).length;

const RAW_SKILLS: Skill[] = [
  {
    id: 'spec-driven-development',
    title: 'Spec-Driven Development',
    summary: 'A written specification is the single source of truth for every app — code follows it, never the other way round.',
    evidence: [
      `Every one of the ${PROJECTS_DATA.length} apps in this monorepo is gated on a spec in specs/ read before any code change; a request that contradicts the spec is a stop-and-flag, not a judgment call.`,
      '`validate-specs.ps1 -Strict` and `harness-status.mjs` fail the build on a missing or unchecked spec, so drift is sensed automatically, not just documented.',
    ],
  },
  {
    id: 'contract-first-schemas',
    title: 'Contract-First Data Modelling',
    summary: 'Every data model is a runtime Zod schema with the TypeScript type inferred from it, validated at its actual input boundary.',
    evidence: [
      'This portfolio\'s own project and skill records are `z.object` schemas in `src/schemas.ts`, parsed via `.parse()` on every load — a bad row breaks the build, not the UI.',
      'legal-financial-rag validates every imported document and elder-care-planner every stored plan the same way, at the storage/import boundary rather than trusting it implicitly.',
    ],
  },
  {
    id: 'test-driven-engineering',
    title: 'Test-Driven, BDD-Verified Engineering',
    summary: 'Unit tests are written red-first for every logic module, and E2E flows are proven by mutation, not just written once.',
    evidence: [
      `${totalUnitTests} Vitest unit specs and ${totalE2eTests} Playwright E2E/a11y specs currently pass across these ${PROJECTS_DATA.length} shipped apps, all in Given/When/Then BDD form.`,
      'A `no-op-assertion` guardrail blocks any `expect()` with no matcher or a tautological type assertion from merging — coverage has to be capable of failing, not just present.',
    ],
  },
  {
    id: 'accessibility-engineering',
    title: 'Accessibility Engineering',
    summary: 'Every app is swept with an automated WCAG audit as a merge gate, not an afterthought.',
    evidence: [
      `${PROJECTS_DATA.filter((p) => p.metrics.a11yScore.includes('WCAG')).length} of ${PROJECTS_DATA.length} apps report a zero-violation @axe-core/playwright sweep against WCAG 2.0/2.1 AA.`,
      'Guardrails catch specific real regressions before a human reviewer sees them: sub-4.5:1 color contrast on bright accent colors, and a `role="tab"` missing its `role="tablist"` ancestor.',
    ],
  },
  {
    id: 'security-privacy-engineering',
    title: 'Security & Privacy-First Architecture',
    summary: 'Sensitive data stays on-device by construction, not by policy — encrypted with real key derivation, never phoned home.',
    evidence: [
      'legal-financial-rag runs its full RAG pipeline 100% client-side with zero network calls, AES-GCM 256 document encryption, PBKDF2 key derivation at 100,000 iterations, and a tamper-evident hash-chain audit log.',
      'Every app runs an automated dependency security audit as part of `test-app.mjs`, gating the merge on 0 high-severity vulnerabilities.',
    ],
  },
  {
    id: 'pwa-native-delivery',
    title: 'PWA & Native Android Delivery',
    summary: 'The same codebase ships installable on the web and packaged as a real Android app.',
    evidence: [
      `${pwaCount} of ${PROJECTS_DATA.length} apps are installable PWAs; ${androidCount} also ship a Capacitor Android container, with mood-diner building a real Play Store-ready APK.`,
      'A `capacitor-absolute-base` guardrail blocks a hardcoded GitHub Pages subpath from shipping inside the Android WebView, where it would boot to a blank screen despite the web build staying green.',
    ],
  },
  {
    id: 'deterministic-harness-engineering',
    title: 'Deterministic Harness & Guardrail Engineering',
    summary: 'A no-LLM, zero-dependency Node harness senses drift, proposes work, and gates every merge — built and maintained like the apps it watches.',
    evidence: [
      'Every guardrail in `scripts/harness-status.mjs` traces back to a real shipped bug and carries its own self-test, so the gate that catches regressions can\'t itself silently regress.',
      '`harness-learn.mjs` blocks a guardrail from existing without a matching prose lesson in AGENTS.md, keeping enforcement and documentation from drifting apart.',
    ],
  },
  {
    id: 'in-browser-ml-rag',
    title: 'In-Browser ML & Retrieval',
    summary: 'Retrieval and embeddings run in the browser or on-device, with no inference server in the loop.',
    evidence: [
      'legal-financial-rag combines a clause-preserving chunker, BM25 lexical ranking, and cosine vector similarity entirely client-side for private legal document search.',
      'smart-recipe-app builds its recipe corpus embeddings locally with `@huggingface/transformers`, and travel-packing-app runs ONNX background removal in-browser.',
    ],
  },
];

export const SKILLS_DATA: Skill[] = RAW_SKILLS.map((skill) => SkillSchema.parse(skill));
