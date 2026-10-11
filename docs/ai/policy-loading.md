# Runtime Policy Loading

> Version: 1.0.0  
> Last updated: 2026-01-15

## Overview

The runtime AI receives **Markdown policy documents** that define its behavior, tone, and constraints. These are NOT coding assistant instructions — they are loaded by the application at runtime and injected into AI prompts.

## Policy Files

Located at `src/services/ai/policies/`:

| File | Purpose | Always loaded? |
|------|---------|----------------|
| `SOUL.md` | Role, tone, epistemic humility, user autonomy | Yes |
| `PERSONAL_OS_RULES.md` | System semantics (entities, relationships) | Yes |
| `RECOMMENDATION_RULES.md` | Evidence, quality, duplication, no-hallucination rules | Yes |
| `DOMAIN_KNOWLEDGE.md` | Domain concepts (branding, learning, etc.) | Only for relevant signals |

## File Structure

Each policy file has a YAML frontmatter header:

```markdown
---
version: 1.0.0
updated_at: 2026-01-15
purpose: One-line description of this policy's role
---

# Policy Title

Content...
```

The `version` field is persisted on every `AIRecommendation` and `AIRecommendationRun` record, enabling traceability when policies change.

## Loading Mechanism

### Vite `?raw` Imports

Policy files are loaded via Vite's native `?raw` import — no plugin required:

```typescript
// src/services/ai/proactive/policyLoader.ts
import soulMd from '../policies/SOUL.md?raw';
import personalOsRulesMd from '../policies/PERSONAL_OS_RULES.md?raw';
import recommendationRulesMd from '../policies/RECOMMENDATION_RULES.md?raw';
import domainKnowledgeMd from '../policies/DOMAIN_KNOWLEDGE.md?raw';
```

### TypeScript Support

A `src/vite-env.d.ts` ambient declaration makes TypeScript accept `?raw`:

```typescript
declare module '*.md?raw' {
  const content: string;
  export default content;
}
/// <reference types="vite/client" />
```

## Policy Loader API

```typescript
interface PolicyDocument {
  version: string;
  updatedAt: string;
  purpose: string;
  content: string;
}

interface PolicyBundle {
  soul: PolicyDocument;
  personalOsRules: PolicyDocument;
  recommendationRules: PolicyDocument;
  domainKnowledge?: PolicyDocument;
  combinedVersion: string;  // e.g. "soul:1.0.0+rules:1.0.0+..."
}

function loadPolicyForCandidate(candidate: ProactiveCandidate): PolicyBundle
function loadPolicyForIdea(): PolicyBundle
```

## Lazy / Task-Dependent Loading

Do NOT attach all Markdown files to every AI request.

| Signal type | Policies loaded |
|-------------|----------------|
| All recommendation calls | SOUL + RECOMMENDATION_RULES + PERSONAL_OS_RULES |
| Learning / skill signals | + DOMAIN_KNOWLEDGE |
| Idea-related signals | + DOMAIN_KNOWLEDGE |
| Branding/marketing signals | + DOMAIN_KNOWLEDGE |

The loader returns all four modules (they are bundled at build time), but the engine **selects which ones to concatenate** into the prompt based on the candidate type.

## Knowledge Hierarchy

The runtime AI receives information in this priority order:

```
1. SYSTEM SAFETY / TOOL POLICY (hard-coded in engine)
2. SOUL.md
3. PERSONAL_OS_RULES.md
4. RECOMMENDATION_RULES.md
5. DOMAIN_KNOWLEDGE.md (when relevant)
6. LIVE DATABASE / TOOL RESULTS (candidate evidence)
7. USER REQUEST (the recommendation prompt)
8. MODEL REASONING
```

**Critical rule:** User facts come from the live database. Markdown files are policy/knowledge, NOT evidence of the user's state.

## Version Tracking

Every persisted `AIRecommendation` and `AIRecommendationRun` stores:

```typescript
policy_version: string;  // e.g. "soul:1.0.0+rules:1.0.0+personalOs:1.0.0+domain:1.0.0"
```

This enables:
- Tracing why a recommendation was generated a certain way
- Understanding behavioral changes across policy versions
- Debugging when a policy update changes output quality

## Build-Time Behavior

- Policy files are included in the Vite bundle as raw strings
- No runtime file system access needed
- No network requests for policies
- Tree-shaking: unused policies are still bundled (small, ~2KB each)

## Updating Policies

When editing a policy file:

1. Bump the `version` in the frontmatter
2. Update `updated_at`
3. No code changes required — the loader picks up the new content automatically on next build
