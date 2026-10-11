/**
 * Module 11 Phase 5 — Policy Loader Verification
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import {
  parsePolicyRaw,
  buildPolicyBundle,
  requiresDomainKnowledge,
  getMandatoryPoliciesVersionFromDocs,
  POLICY_NAMES,
  PolicyLoadError,
  PolicyDocument,
  DOMAIN_KNOWLEDGE_REQUIRED_SIGNALS,
} from '../services/ai/proactive/policyLoaderCore';

import { ProactiveCandidate, SignalType } from '../types/recommendation.types';

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean, detail?: string): void {
  if (condition) {
    passed++;
    console.log('  ✓ ' + name);
  } else {
    failed++;
    const msg = detail ? ' — ' + detail : '';
    console.error('  ✗ ' + name + msg);
  }
}

function section(title: string): void {
  console.log('\n── ' + title + ' ' + '─'.repeat(Math.max(0, 60 - title.length)));
}

const POLICIES_DIR = path.resolve(__dirname, '../services/ai/policies');

function readPolicy(filename: string): string {
  return fs.readFileSync(path.join(POLICIES_DIR, filename), 'utf-8');
}

function makeCandidate(signalType: SignalType): ProactiveCandidate {
  return {
    signalType,
    scopeType: 'goal',
    scopeId: 'test-scope',
    severity: 'medium',
    evidence: {},
    dedupeKey: signalType + ':test-scope',
    detectedAt: '2026-06-15T12:00:00.000Z',
  };
}

let soulRaw: string;
let personalOsRulesRaw: string;
let recommendationRulesRaw: string;
let domainKnowledgeRaw: string;

try {
  soulRaw = readPolicy('SOUL.md');
  personalOsRulesRaw = readPolicy('PERSONAL_OS_RULES.md');
  recommendationRulesRaw = readPolicy('RECOMMENDATION_RULES.md');
  domainKnowledgeRaw = readPolicy('DOMAIN_KNOWLEDGE.md');
} catch (err) {
  console.error('FATAL: Could not read policy files from disk:', err);
  process.exit(1);
}

let soul: PolicyDocument;
let personalOsRules: PolicyDocument;
let recommendationRules: PolicyDocument;
let domainKnowledge: PolicyDocument;

try {
  soul = parsePolicyRaw(POLICY_NAMES.SOUL, soulRaw);
  personalOsRules = parsePolicyRaw(POLICY_NAMES.PERSONAL_OS_RULES, personalOsRulesRaw);
  recommendationRules = parsePolicyRaw(POLICY_NAMES.RECOMMENDATION_RULES, recommendationRulesRaw);
  domainKnowledge = parsePolicyRaw(POLICY_NAMES.DOMAIN_KNOWLEDGE, domainKnowledgeRaw);
} catch (err) {
  console.error('FATAL: Policy parsing failed during test setup:', err);
  process.exit(1);
}

function test_load_all_policies(): void {
  section('§01  Load and parse all four policy files');

  check('SOUL parsed successfully', soul !== undefined && soul !== null);
  check('PERSONAL_OS_RULES parsed successfully', personalOsRules !== undefined);
  check('RECOMMENDATION_RULES parsed successfully', recommendationRules !== undefined);
  check('DOMAIN_KNOWLEDGE parsed successfully', domainKnowledge !== undefined);

  check('SOUL name is SOUL', soul.name === POLICY_NAMES.SOUL);
  check('PERSONAL_OS_RULES name is correct', personalOsRules.name === POLICY_NAMES.PERSONAL_OS_RULES);
  check('RECOMMENDATION_RULES name is correct', recommendationRules.name === POLICY_NAMES.RECOMMENDATION_RULES);
  check('DOMAIN_KNOWLEDGE name is correct', domainKnowledge.name === POLICY_NAMES.DOMAIN_KNOWLEDGE);
}

function test_soul_frontmatter(): void {
  section('§02  SOUL frontmatter');

  check('SOUL version is 1.0.0', soul.version === '1.0.0');
  check('SOUL updatedAt is 2026-01-15', soul.updatedAt === '2026-01-15');
  check('SOUL purpose is non-empty', soul.purpose.length > 0);
}

function test_personal_os_rules_frontmatter(): void {
  section('§03  PERSONAL_OS_RULES frontmatter');

  check('PERSONAL_OS_RULES version is 1.0.0', personalOsRules.version === '1.0.0');
  check('PERSONAL_OS_RULES updatedAt is 2026-01-15', personalOsRules.updatedAt === '2026-01-15');
  check('PERSONAL_OS_RULES purpose is non-empty', personalOsRules.purpose.length > 0);
}

function test_recommendation_rules_frontmatter(): void {
  section('§04  RECOMMENDATION_RULES frontmatter');

  check('RECOMMENDATION_RULES version is 1.0.0', recommendationRules.version === '1.0.0');
  check('RECOMMENDATION_RULES updatedAt is 2026-01-15', recommendationRules.updatedAt === '2026-01-15');
  check('RECOMMENDATION_RULES purpose is non-empty', recommendationRules.purpose.length > 0);
}

function test_domain_knowledge_frontmatter(): void {
  section('§05  DOMAIN_KNOWLEDGE frontmatter');

  check('DOMAIN_KNOWLEDGE version is 1.0.0', domainKnowledge.version === '1.0.0');
  check('DOMAIN_KNOWLEDGE updatedAt is 2026-01-15', domainKnowledge.updatedAt === '2026-01-15');
  check('DOMAIN_KNOWLEDGE purpose is non-empty', domainKnowledge.purpose.length > 0);
}

function test_content_completeness(): void {
  section('§06  PolicyDocument content includes frontmatter and body');

  check('SOUL content starts with ---', soul.content.startsWith('---'));
  check('SOUL content contains body text', soul.content.includes('# SOUL'));

  check('PERSONAL_OS_RULES content starts with ---', personalOsRules.content.startsWith('---'));
  check('PERSONAL_OS_RULES content contains body', personalOsRules.content.includes('# PERSONAL OS RULES'));

  check('RECOMMENDATION_RULES content starts with ---', recommendationRules.content.startsWith('---'));
  check('RECOMMENDATION_RULES content contains body', recommendationRules.content.includes('# RECOMMENDATION RULES'));

  check('DOMAIN_KNOWLEDGE content starts with ---', domainKnowledge.content.startsWith('---'));
  check('DOMAIN_KNOWLEDGE content contains body', domainKnowledge.content.includes('# DOMAIN KNOWLEDGE'));

  check('SOUL content length > 100', soul.content.length > 100);
  check('DOMAIN_KNOWLEDGE content length > 100', domainKnowledge.content.length > 100);
}

function test_combined_version_deterministic(): void {
  section('§07  buildPolicyBundle — combinedVersion is deterministic');

  const bundle1 = buildPolicyBundle(soul, personalOsRules, recommendationRules, domainKnowledge);
  const bundle2 = buildPolicyBundle(soul, personalOsRules, recommendationRules, domainKnowledge);
  const bundle3 = buildPolicyBundle(soul, personalOsRules, recommendationRules, domainKnowledge);

  check('combinedVersion run 1 = run 2', bundle1.combinedVersion === bundle2.combinedVersion);
  check('combinedVersion run 1 = run 3', bundle1.combinedVersion === bundle3.combinedVersion);
  check('combinedVersion is non-empty', bundle1.combinedVersion.length > 0);
  check('combinedVersion contains version strings', bundle1.combinedVersion.includes('1.0.0'));
  check('combinedVersion does not contain a date/time string', !/\d{4}-\d{2}-\d{2}T/.test(bundle1.combinedVersion));
}

function test_combined_version_sensitivity(): void {
  section('§08  combinedVersion changes when policy version changes');

  const altSoul = parsePolicyRaw('SOUL', soulRaw.replace('version: 1.0.0', 'version: 2.0.0'));

  const bundleV1 = buildPolicyBundle(soul, personalOsRules, recommendationRules);
  const bundleV2 = buildPolicyBundle(altSoul, personalOsRules, recommendationRules);

  check('combinedVersion differs when policy version changes', bundleV1.combinedVersion !== bundleV2.combinedVersion);
  check('updated bundle contains new version', bundleV2.combinedVersion.includes('2.0.0'));
}

function test_domain_knowledge_included_when_required(): void {
  section('§09  Domain-knowledge signals include DOMAIN_KNOWLEDGE');

  const domainSignals: SignalType[] = [
    'learning_without_application',
    'skill_evidence_gap',
    'idea_opportunity',
  ];

  for (const signalType of domainSignals) {
    const candidate = makeCandidate(signalType);
    const needsDomain = requiresDomainKnowledge(candidate);

    check('requiresDomainKnowledge is true for ' + signalType, needsDomain);

    const bundle = buildPolicyBundle(
      soul, personalOsRules, recommendationRules,
      needsDomain ? domainKnowledge : undefined
    );
    check('bundle includes domainKnowledge for ' + signalType, bundle.domainKnowledge !== undefined);
  }
}

function test_domain_knowledge_excluded_when_not_required(): void {
  section('§10  Non-domain signals exclude DOMAIN_KNOWLEDGE');

  const structuralSignals: SignalType[] = [
    'goal_inactive',
    'goal_without_clear_next_action',
    'goal_next_action',
    'project_stalled',
    'project_next_action',
    'life_area_attention',
    'execution_decline',
    'completed_goal_followup',
  ];

  for (const signalType of structuralSignals) {
    const candidate = makeCandidate(signalType);
    const needsDomain = requiresDomainKnowledge(candidate);

    check('requiresDomainKnowledge is false for ' + signalType, !needsDomain);

    const bundle = buildPolicyBundle(
      soul, personalOsRules, recommendationRules,
      needsDomain ? domainKnowledge : undefined
    );
    check('bundle excludes domainKnowledge for ' + signalType, bundle.domainKnowledge === undefined);
  }
}

function test_combined_version_with_without_domain(): void {
  section('§11  combinedVersion differs with and without domainKnowledge');

  const bundleWithDomain = buildPolicyBundle(soul, personalOsRules, recommendationRules, domainKnowledge);
  const bundleWithoutDomain = buildPolicyBundle(soul, personalOsRules, recommendationRules);

  check('combinedVersion differs when domainKnowledge is included vs excluded',
    bundleWithDomain.combinedVersion !== bundleWithoutDomain.combinedVersion,
    'with=' + bundleWithDomain.combinedVersion + ' without=' + bundleWithoutDomain.combinedVersion);

  check('bundle without domain has undefined domainKnowledge', bundleWithoutDomain.domainKnowledge === undefined);
  check('bundle with domain has defined domainKnowledge', bundleWithDomain.domainKnowledge !== undefined);
}

function test_fail_closed_invalid_frontmatter(): void {
  section('§12  Fail-closed: invalid frontmatter throws PolicyLoadError');

  const noDelimiter = 'version: 1.0.0\nupdated_at: 2026-01-15\npurpose: test\n\n# Body';
  let threw = false;
  let err;
  try {
    parsePolicyRaw('TEST', noDelimiter);
  } catch (e) {
    threw = true;
    err = e;
  }
  check('no delimiter throws PolicyLoadError', threw);
  check('error is PolicyLoadError instance', err instanceof PolicyLoadError);
  if (err instanceof PolicyLoadError) {
    check('error policyName is TEST', err.policyName === 'TEST');
  }
}

function test_fail_closed_missing_field(): void {
  section('§13  Fail-closed: missing required frontmatter field throws');

  const missingPurpose = '---\nversion: 1.0.0\nupdated_at: 2026-01-15\n---\n\n# Body content here';
  let threw1 = false;
  let err1;
  try {
    parsePolicyRaw('TEST', missingPurpose);
  } catch (e) {
    threw1 = true;
    err1 = e;
  }
  check('missing purpose throws PolicyLoadError', threw1);
  check('error is PolicyLoadError', err1 instanceof PolicyLoadError);

  const missingVersion = '---\nupdated_at: 2026-01-15\npurpose: test purpose\n---\n\n# Body';
  let threw2 = false;
  try {
    parsePolicyRaw('TEST', missingVersion);
  } catch {
    threw2 = true;
  }
  check('missing version throws PolicyLoadError', threw2);

  const missingDate = '---\nversion: 1.0.0\npurpose: test purpose\n---\n\n# Body';
  let threw3 = false;
  try {
    parsePolicyRaw('TEST', missingDate);
  } catch {
    threw3 = true;
  }
  check('missing updated_at throws PolicyLoadError', threw3);
}

function test_fail_closed_empty_body(): void {
  section('§14  Fail-closed: empty body throws PolicyLoadError');

  const emptyBody = '---\nversion: 1.0.0\nupdated_at: 2026-01-15\npurpose: test\n---\n\n   \n  ';
  let threw = false;
  let err;
  try {
    parsePolicyRaw('TEST', emptyBody);
  } catch (e) {
    threw = true;
    err = e;
  }
  check('empty body throws PolicyLoadError', threw);
  check('error is PolicyLoadError', err instanceof PolicyLoadError);
}

function test_fail_closed_empty_content(): void {
  section('§15  Fail-closed: empty content throws PolicyLoadError');

  let threw = false;
  let err;
  try {
    parsePolicyRaw('TEST', '');
  } catch (e) {
    threw = true;
    err = e;
  }
  check('empty string throws PolicyLoadError', threw);
  check('error is PolicyLoadError', err instanceof PolicyLoadError);

  let threw2 = false;
  try {
    parsePolicyRaw('TEST', '   \n\n  ');
  } catch {
    threw2 = true;
  }
  check('whitespace-only string throws PolicyLoadError', threw2);
}

function test_fail_closed_no_closing_delimiter(): void {
  section('§16  Fail-closed: no closing frontmatter delimiter throws');

  const noClosing = '---\nversion: 1.0.0\nupdated_at: 2026-01-15\npurpose: test\n\n# Body here';
  let threw = false;
  let err;
  try {
    parsePolicyRaw('TEST', noClosing);
  } catch (e) {
    threw = true;
    err = e;
  }
  check('missing closing --- throws PolicyLoadError', threw);
  check('error is PolicyLoadError', err instanceof PolicyLoadError);
}

function test_domain_knowledge_required_set(): void {
  section('§17  DOMAIN_KNOWLEDGE_REQUIRED_SIGNALS set correctness');

  check('learning_without_application is in required set',
    DOMAIN_KNOWLEDGE_REQUIRED_SIGNALS.has('learning_without_application'));
  check('skill_evidence_gap is in required set',
    DOMAIN_KNOWLEDGE_REQUIRED_SIGNALS.has('skill_evidence_gap'));
  check('idea_opportunity is in required set',
    DOMAIN_KNOWLEDGE_REQUIRED_SIGNALS.has('idea_opportunity'));

  check('exactly 3 signals require domain knowledge',
    DOMAIN_KNOWLEDGE_REQUIRED_SIGNALS.size === 3,
    'got ' + DOMAIN_KNOWLEDGE_REQUIRED_SIGNALS.size);
}

function test_structural_signals_no_domain(): void {
  section('§18  Structural signals do NOT require DOMAIN_KNOWLEDGE');

  const structural: SignalType[] = [
    'goal_inactive',
    'goal_without_clear_next_action',
    'goal_next_action',
    'project_stalled',
    'project_next_action',
    'life_area_attention',
    'execution_decline',
    'completed_goal_followup',
  ];

  for (const s of structural) {
    check(s + ' not in DOMAIN_KNOWLEDGE_REQUIRED_SIGNALS',
      !DOMAIN_KNOWLEDGE_REQUIRED_SIGNALS.has(s));
  }
}

function test_parse_determinism(): void {
  section('§19  Same input → same PolicyDocument metadata (determinism)');

  const soul2 = parsePolicyRaw(POLICY_NAMES.SOUL, soulRaw);
  const soul3 = parsePolicyRaw(POLICY_NAMES.SOUL, soulRaw);

  check('soul.version stable across 3 parses', soul.version === soul2.version && soul2.version === soul3.version);
  check('soul.updatedAt stable across 3 parses', soul.updatedAt === soul2.updatedAt);
  check('soul.purpose stable across 3 parses', soul.purpose === soul2.purpose);
  check('soul.content stable across 3 parses', soul.content === soul2.content);

  const dk2 = parsePolicyRaw(POLICY_NAMES.DOMAIN_KNOWLEDGE, domainKnowledgeRaw);
  check('domainKnowledge.version stable', domainKnowledge.version === dk2.version);
  check('domainKnowledge.content stable', domainKnowledge.content === dk2.content);
}

function test_agents_md_not_loaded(): void {
  section('§20  AGENTS.md is never included in runtime policies');

  const policyNamesValues = Object.values(POLICY_NAMES);
  check('POLICY_NAMES does not contain AGENTS',
    !policyNamesValues.some(function(n) { return n.toUpperCase().includes('AGENT'); }));

  const bundle = buildPolicyBundle(soul, personalOsRules, recommendationRules, domainKnowledge);
  // allContent intentionally unused - kept for documentation

  const allNames = [
    bundle.soul.name,
    bundle.personalOsRules.name,
    bundle.recommendationRules.name,
    bundle.domainKnowledge ? bundle.domainKnowledge.name : '',
  ];
  check('no policy document is named AGENTS',
    !allNames.some(function(n) { return n.toUpperCase() === 'AGENTS'; }));

  check('POLICY_NAMES has exactly 4 entries', policyNamesValues.length === 4);
}

function test_policy_load_error_fields(): void {
  section('§21  PolicyLoadError has correct name and message fields');

  const err = new PolicyLoadError('MY_POLICY', 'test reason');

  check('PolicyLoadError.name is PolicyLoadError', err.name === 'PolicyLoadError');
  check('PolicyLoadError.policyName is MY_POLICY', err.policyName === 'MY_POLICY');
  check('PolicyLoadError.reason is test reason', err.reason === 'test reason');
  check('PolicyLoadError.message contains policyName and reason',
    err.message.includes('MY_POLICY') && err.message.includes('test reason'));
  check('PolicyLoadError is instanceof Error', err instanceof Error);
  check('PolicyLoadError is instanceof PolicyLoadError', err instanceof PolicyLoadError);
}

function test_mandatory_policies_version(): void {
  section('§22  getMandatoryPoliciesVersion is stable and excludes domain');

  const v1 = getMandatoryPoliciesVersionFromDocs(soul, personalOsRules, recommendationRules);
  const v2 = getMandatoryPoliciesVersionFromDocs(soul, personalOsRules, recommendationRules);

  check('getMandatoryPoliciesVersion is stable', v1 === v2);
  check('getMandatoryPoliciesVersion is non-empty', v1.length > 0);
  check('getMandatoryPoliciesVersion contains version numbers', v1.includes('1.0.0'));

  const parts = v1.split('|');
  check('getMandatoryPoliciesVersion has 3 version parts (one per mandatory policy)',
    parts.length === 3, 'got ' + parts.length + ': ' + v1);

  const fullBundle = buildPolicyBundle(soul, personalOsRules, recommendationRules, domainKnowledge);
  check('mandatory-only version differs from full bundle version',
    v1 !== fullBundle.combinedVersion,
    'mandatory=' + v1 + ' full=' + fullBundle.combinedVersion);
}

function main(): void {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Module 11 Phase 5 — Policy Loader Tests');
  console.log('═══════════════════════════════════════════════════════════');

  test_load_all_policies();
  test_soul_frontmatter();
  test_personal_os_rules_frontmatter();
  test_recommendation_rules_frontmatter();
  test_domain_knowledge_frontmatter();
  test_content_completeness();
  test_combined_version_deterministic();
  test_combined_version_sensitivity();
  test_domain_knowledge_included_when_required();
  test_domain_knowledge_excluded_when_not_required();
  test_combined_version_with_without_domain();
  test_fail_closed_invalid_frontmatter();
  test_fail_closed_missing_field();
  test_fail_closed_empty_body();
  test_fail_closed_empty_content();
  test_fail_closed_no_closing_delimiter();
  test_domain_knowledge_required_set();
  test_structural_signals_no_domain();
  test_parse_determinism();
  test_agents_md_not_loaded();
  test_policy_load_error_fields();
  test_mandatory_policies_version();

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  Phase 5 verification: ' + passed + ' passed, ' + failed + ' failed');
  console.log('═══════════════════════════════════════════════════════════');

  process.exit(failed > 0 ? 1 : 0);
}

main();
