import { ProactiveCandidate, SignalType } from '../../../types/recommendation.types';

export interface PolicyDocument {
  name: string;
  version: string;
  updatedAt: string;
  purpose: string;
  content: string;
}

export interface PolicyBundle {
  soul: PolicyDocument;
  personalOsRules: PolicyDocument;
  recommendationRules: PolicyDocument;
  domainKnowledge?: PolicyDocument;
  combinedVersion: string;
}

export class PolicyLoadError extends Error {
  constructor(public readonly policyName: string, public readonly reason: string) {
    super(`PolicyLoadError [${policyName}]: ${reason}`);
    this.name = 'PolicyLoadError';
  }
}

export const DOMAIN_KNOWLEDGE_REQUIRED_SIGNALS = new Set<SignalType>([
  'learning_without_application',
  'skill_evidence_gap',
  'idea_opportunity',
]);

export function requiresDomainKnowledge(candidate: ProactiveCandidate): boolean {
  return DOMAIN_KNOWLEDGE_REQUIRED_SIGNALS.has(candidate.signalType);
}

export const POLICY_NAMES = {
  SOUL: 'SOUL',
  PERSONAL_OS_RULES: 'PERSONAL_OS_RULES',
  RECOMMENDATION_RULES: 'RECOMMENDATION_RULES',
  DOMAIN_KNOWLEDGE: 'DOMAIN_KNOWLEDGE',
} as const;

export type PolicyName = typeof POLICY_NAMES[keyof typeof POLICY_NAMES];

interface ParsedFrontmatter {
  version: string;
  updated_at: string;
  purpose: string;
}

export function parseFrontmatter(raw: string, policyName: string): ParsedFrontmatter {
  if (!raw.startsWith('---')) {
    throw new PolicyLoadError(policyName, 'File does not start with YAML frontmatter delimiter ---');
  }

  const closingIndex = raw.indexOf('---', 3);
  if (closingIndex === -1) {
    throw new PolicyLoadError(policyName, 'YAML frontmatter closing delimiter --- not found');
  }

  const frontmatterBlock = raw.slice(3, closingIndex);
  const lines = frontmatterBlock.split('\n');

  const fields: Record<string, string> = {};
  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;
    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();
    if (key.length > 0 && value.length > 0) {
      fields[key] = value;
    }
  }

  const required: Array<keyof ParsedFrontmatter> = ['version', 'updated_at', 'purpose'];
  for (const field of required) {
    if (!fields[field] || fields[field].trim() === '') {
      throw new PolicyLoadError(policyName, `Required frontmatter field '${field}' is missing or empty`);
    }
  }

  return {
    version: fields['version'],
    updated_at: fields['updated_at'],
    purpose: fields['purpose'],
  };
}

export function validateBody(raw: string, policyName: string): void {
  const closingIndex = raw.indexOf('---', 3);
  const body = closingIndex !== -1 ? raw.slice(closingIndex + 3).trim() : raw.trim();
  if (body.length === 0) {
    throw new PolicyLoadError(policyName, 'Policy file body is empty after frontmatter');
  }
}

export function parsePolicyRaw(name: string, raw: string): PolicyDocument {
  if (!raw || raw.trim().length === 0) {
    throw new PolicyLoadError(name, 'Policy file content is empty');
  }

  const frontmatter = parseFrontmatter(raw, name);
  validateBody(raw, name);

  return {
    name,
    version: frontmatter.version,
    updatedAt: frontmatter.updated_at,
    purpose: frontmatter.purpose,
    content: raw,
  };
}

export function buildCombinedVersion(docs: PolicyDocument[]): string {
  return docs.map((d) => d.version).sort().join('|');
}

export function buildPolicyBundle(
  soul: PolicyDocument,
  personalOsRules: PolicyDocument,
  recommendationRules: PolicyDocument,
  domainKnowledge?: PolicyDocument,
): PolicyBundle {
  const mandatoryDocs = [soul, personalOsRules, recommendationRules];
  const allDocs = domainKnowledge ? [...mandatoryDocs, domainKnowledge] : mandatoryDocs;
  return {
    soul,
    personalOsRules,
    recommendationRules,
    domainKnowledge,
    combinedVersion: buildCombinedVersion(allDocs),
  };
}

export function getMandatoryPoliciesVersionFromDocs(
  soul: PolicyDocument,
  personalOsRules: PolicyDocument,
  recommendationRules: PolicyDocument,
): string {
  return buildCombinedVersion([soul, personalOsRules, recommendationRules]);
}