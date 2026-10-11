import { ProactiveCandidate } from '../../../types/recommendation.types';

export type { PolicyDocument, PolicyBundle };
export { PolicyLoadError };
export { DOMAIN_KNOWLEDGE_REQUIRED_SIGNALS, POLICY_NAMES };
export type { PolicyName };
export { requiresDomainKnowledge };
export { parseFrontmatter, validateBody, parsePolicyRaw };
export { buildCombinedVersion, buildPolicyBundle, getMandatoryPoliciesVersionFromDocs };

import { 
  PolicyDocument, 
  PolicyBundle, 
  PolicyLoadError,
  DOMAIN_KNOWLEDGE_REQUIRED_SIGNALS, 
  POLICY_NAMES, 
  PolicyName,
  requiresDomainKnowledge,
  parseFrontmatter, 
  validateBody, 
  parsePolicyRaw,
  buildCombinedVersion, 
  buildPolicyBundle, 
  getMandatoryPoliciesVersionFromDocs 
} from './policyLoaderCore';

import soulRaw from '../policies/SOUL.md?raw';
import personalOsRulesRaw from '../policies/PERSONAL_OS_RULES.md?raw';
import recommendationRulesRaw from '../policies/RECOMMENDATION_RULES.md?raw';
import domainKnowledgeRaw from '../policies/DOMAIN_KNOWLEDGE.md?raw';

const _soul = parsePolicyRaw(POLICY_NAMES.SOUL, soulRaw);
const _personalOsRules = parsePolicyRaw(POLICY_NAMES.PERSONAL_OS_RULES, personalOsRulesRaw);
const _recommendationRules = parsePolicyRaw(POLICY_NAMES.RECOMMENDATION_RULES, recommendationRulesRaw);

let _domainKnowledge: PolicyDocument | PolicyLoadError;
try {
  _domainKnowledge = parsePolicyRaw(POLICY_NAMES.DOMAIN_KNOWLEDGE, domainKnowledgeRaw);
} catch (err) {
  _domainKnowledge = err instanceof PolicyLoadError ? err : new PolicyLoadError(POLICY_NAMES.DOMAIN_KNOWLEDGE, String(err));
}

export function loadPolicies(): PolicyBundle {
  if (_domainKnowledge instanceof PolicyLoadError) { throw _domainKnowledge; }
  const docs = [_soul, _personalOsRules, _recommendationRules, _domainKnowledge];
  return { soul: _soul, personalOsRules: _personalOsRules, recommendationRules: _recommendationRules, domainKnowledge: _domainKnowledge, combinedVersion: buildCombinedVersion(docs) };
}

export function loadPolicyForCandidate(candidate: ProactiveCandidate): PolicyBundle {
  const needsDomain = requiresDomainKnowledge(candidate);
  if (needsDomain && _domainKnowledge instanceof PolicyLoadError) { throw _domainKnowledge; }
  const domainDoc = needsDomain && !(_domainKnowledge instanceof PolicyLoadError) ? _domainKnowledge : undefined;
  const mandatoryDocs = [_soul, _personalOsRules, _recommendationRules];
  const allDocs = domainDoc ? [...mandatoryDocs, domainDoc] : mandatoryDocs;
  return { soul: _soul, personalOsRules: _personalOsRules, recommendationRules: _recommendationRules, domainKnowledge: domainDoc, combinedVersion: buildCombinedVersion(allDocs) };
}

export function getMandatoryPoliciesVersion(): string {
  return buildCombinedVersion([_soul, _personalOsRules, _recommendationRules]);
}

export function getParsedDocuments(): {
  soul: PolicyDocument;
  personalOsRules: PolicyDocument;
  recommendationRules: PolicyDocument;
  domainKnowledge: PolicyDocument | PolicyLoadError;
} {
  return { soul: _soul, personalOsRules: _personalOsRules, recommendationRules: _recommendationRules, domainKnowledge: _domainKnowledge };
}