---
version: 1.0.0
updated_at: 2026-01-15
purpose: Domain concepts the AI may reference when reasoning about recommendations — NOT user-specific facts
---

# DOMAIN KNOWLEDGE

This file contains general domain knowledge the AI may reference when generating recommendations. It does NOT contain user-specific facts — those come from the live database.

When domain knowledge and user data conflict: **database facts describe the user; domain knowledge describes the subject.**

## Brand Strategy

### Positioning

The strategic definition of where a brand sits in the market relative to competitors. Includes:
- Target audience definition
- Unique value proposition
- Competitive differentiation
- Price-value positioning

Evidence of positioning work: competitor research, audience definition documents, value proposition statements, positioning maps.

### Messaging

The verbal and written expression of a brand's positioning. Includes:
- Taglines and headlines
- Brand voice guidelines
- Content pillars
- Key messages per audience segment

Evidence of messaging work: copy documents, brand voice guides, content calendars, headline variants.

### Customer Personas

Research-based archetypes representing key audience segments. Includes:
- Demographics and psychographics
- Pain points and goals
- Behavioral patterns
- Preferred channels

Evidence of persona work: persona documents, interview summaries, survey analysis, journey maps.

**Gap pattern:** If a user has extensive Positioning and Messaging evidence but no Persona evidence, this MAY indicate a learning opportunity — but only if the goal context supports it. Do not assume ignorance; phrase as "no recent Persona evidence detected."

### Competitor Research

Systematic analysis of competitors' positioning, messaging, products, and strategies. Includes:
- Competitor maps
- Feature comparisons
- Pricing analysis
- SWOT analyses

### Audience Research

Research into the target audience's needs, behaviors, and preferences. Includes:
- User interviews
- Survey data
- Behavioral analytics
- Segmentation studies

## Marketing

### Content Marketing

Creating and distributing valuable content to attract and engage a target audience. Includes:
- Blog posts, articles, newsletters
- Video content
- Social media content
- Lead magnets

### Growth Strategy

Systematic approaches to scaling reach and revenue. Includes:
- Channel strategy
- Funnel optimization
- Partnership development
- Referral programs

## Learning vs. Application

### Learning Activities

Activities where the primary intent is acquiring new knowledge or skills:
- Reading (articles, books, research)
- Courses and tutorials
- Workshops and seminars
- Experimentation (in a sandbox, not production)

Evidence signals: `Activity.category === 'Study & Research'` or `'Skill Acquisition'`, tasks with learning-oriented titles, projects explicitly tagged as learning.

### Application Activities

Activities where acquired knowledge is applied to produce output:
- Shipping a feature
- Writing a deliverable
- Building a prototype for a real project
- Presenting findings to stakeholders

Evidence signals: `Activity.category === 'Deep Work'` or `'Creative Work'`, tasks linked to active projects/goals, completed deliverables.

### The Learning-Application Balance

A healthy practice cycle alternates between learning and application. Indicators of imbalance:

- **Learning-heavy:** 3+ learning activities with < 1 application activity in a period.
- **Application-heavy:** May indicate skill debt; watch for declining output quality.
- **Balanced:** Roughly 1:3 to 1:5 learning:application ratio over a month.

**Recommendation framing:** When suggesting application, reference the specific learned concept. E.g., "Apply the positioning framework from your recent study session to the Branding Strategy goal."

## Skill Evidence

### What Counts as Evidence

- **SkillEvidence records** — explicit evidence entries attached to a skill.
- **SkillHistory entries** — proficiency changes (implying demonstrated capability).
- **Completed tasks** linked to the skill via goal/project relations.
- **Logged activities** whose content or category relates to the skill.
- **Development points** attributed to the skill.

### Evidence Gaps

A skill without recent evidence (default: 30+ days) may indicate:
- The skill is dormant (user has moved focus) — not necessarily a problem.
- The skill is being practiced but not tracked — consider suggesting tracking.
- The skill is genuinely under-developed relative to the user's goals.

**Recommendation framing:** Do not assume a gap is a problem. Frame as: "No recent evidence recorded for [Skill]. Consider tracking an activity or logging a practice session."

## Project Health

### Active Project

A project with `status === 'active'` and at least one linked task or recent activity.

### Stalled Project

A project with:
- No qualifying activity in the last N days (configured per project; default ~7-14).
- Open tasks that have not progressed.
- No recent milestone completions.

**Recommendation framing:** Focus on the next concrete action, not on "the project is failing." E.g., "Review the next actionable task in [Project]."

### Completed Project

A project with `status === 'completed'`. No further recommendations unless a follow-up is warranted (e.g., retrospective task, lessons-learned capture).

## Goal Progression

### Active Goal

A goal with `status === 'active'`. May have:
- Sub-goals (nested goals)
- Linked tasks
- Linked projects (via skill_goal_relations or explicit links)

### Goal Without Clear Next Action

A goal is considered to lack a clear next action when ALL of the following are true:
- Goal status is active (not completed, not archived).
- No open tasks linked to the goal.
- No open tasks linked to any of the goal's active sub-goals.
- No qualifying activity with `related_goal_id` in the last 7 days.
- No linked active project with recent activity.

**Recommendation framing:** Suggest creating ONE concrete next task, not a plan overhaul. E.g., "Create a next-action task for [Goal]."

### Completed Goal

A goal with `status === 'completed'`. Potential follow-up recommendations:
- Create a retrospective task.
- Identify sub-goals that can now be activated.
- Celebrate and archive (but never auto-archive).

## Life Area Balance

### Life Areas

Top-level categories organizing the user's goals. Examples: Professional, Personal, Health, Psychology, Relationships, Creative, Financial, Spiritual.

### Balance Signals

Balance is evaluated RELATIVE TO THE USER'S OWN HISTORY, not against arbitrary thresholds:

- **User-relative baseline:** Average `percentOfTotal` for each area over the last 3 periods (or longer history if available).
- **Deviation signal:** Current period percent is significantly below the user's own baseline AND trend is `'decreased'`.
- **Insufficient history:** If fewer than 2 prior periods exist, expose the raw distribution and trend but do NOT force a recommendation.

**Recommendation framing:** Use neutral observation. E.g., "Professional activity has dominated the selected period while Psychology has had little recent activity. Consider reviewing the Psychology goal."

## Idea Opportunity

### Idea-Goal Overlap

When multiple ideas in Idea Capture share a thematic domain with an active goal, this may indicate an opportunity to:
- Consolidate thinking into a structured plan.
- Create a follow-up task to explore the idea further.
- Connect the idea explicitly to the goal (if the user wants to).

**Critical rule:** The Idea remains an Idea. Never recommend converting an Idea into a Goal or Task directly. Recommend creating a SEPARATE task or goal that explores the idea's theme.

## Execution Metrics

### Completion Rate

Tasks completed / tasks due in a period. A decline of 15%+ vs the previous period is a meaningful signal.

### Consistency

Streak length (consecutive days with ≥ 1 logged activity or task completion). A broken streak after a long run may warrant a gentle "re-establish rhythm" suggestion.

### Planning vs Execution

Ratio of planned tasks (created) to executed tasks (completed). A wide gap may indicate over-planning or under-execution — investigate before recommending.
