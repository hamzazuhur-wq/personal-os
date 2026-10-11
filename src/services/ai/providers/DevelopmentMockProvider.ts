import {
  AIProviderRequest,
  AIProviderResponse,
  IAIProvider,
} from './IAIProvider';
import { generateId } from '../../../utils/idGenerator';

/**
 * =========================================================================
 * DEVELOPMENT / TESTING MOCK PROVIDER
 * =========================================================================
 * 
 * IMPORTANT:
 * This provider is strictly for development simulation, integration testing,
 * and automated evaluation suite verification.
 * 
 * It DOES NOT perform true natural-language AI neural reasoning.
 * 
 * In production or remote deployment, this is replaced by an IAIProvider
 * implementation connected to an LLM provider (Gemini, OpenAI, Claude, Local LLM)
 * via a secure server proxy with ZERO client-side secrets.
 * =========================================================================
 */
export class DevelopmentMockProvider implements IAIProvider {
  readonly id = 'development-mock-provider';
  readonly name = 'Development Mock Provider (Testing Only)';
  readonly isDevelopmentMock = true;

  async generateResponse(request: AIProviderRequest): Promise<AIProviderResponse> {
    const lastMsg = request.messages[request.messages.length - 1];
    const userText = lastMsg ? lastMsg.content.trim() : '';
    const lower = userText.toLowerCase();
    const data = request.relevantStructuredData || {};
    const memories = request.relevantMemories || [];

    // ── 1. Explicit Memory Commands ("Remember that...", "Save memory...") ───
    if (lower.startsWith('remember that') || lower.startsWith('remember:')) {
      const statement = userText.replace(/^remember\s+(that\s*)?:?/i, '').trim();
      return {
        content: `I've prepared a memory record for your preference: "${statement}". Please confirm below to save it permanently.`,
        type: 'action_proposal',
        actionProposal: {
          id: generateId(),
          tool_name: 'saveMemory',
          action_type: 'save_memory',
          title: 'Save New Preference',
          description: `Remember: "${statement}"`,
          parameters: {
            content: statement,
            type: lower.includes('prefer') ? 'preference' : lower.includes('cannot') || lower.includes('must') ? 'constraint' : 'context',
            source: 'explicit_user',
            confidence: 1.0,
          },
          confirmation_required: true,
        },
        sourcesUsed: ['User Instruction'],
      };
    }

    // ── 2. Memory Recall Queries ("What do you remember...", "What are my preferences...") ───
    if (lower.includes('remember') || lower.includes('preference') || lower.includes('constraint')) {
      if (memories.length === 0) {
        return {
          content: "I don't have any confirmed memories or preferences recorded in your system yet. You can tell me 'Remember that...' anytime to save durable preferences.",
          type: 'answer',
          sourcesUsed: ['AI Memory Store (0 records)'],
        };
      }
      const memList = memories
        .map((m: any, i: number) => `${i + 1}. **[${m.type.toUpperCase()}]**: ${m.content}`)
        .join('\n');
      return {
        content: `Here are your currently confirmed personal preferences and constraints:\n\n${memList}`,
        type: 'answer',
        sourcesUsed: [`AI Memory Store (${memories.length} records)`],
      };
    }

    // ── 3. Action Request: Create Goal ("Create a Goal named X", "Add goal X") ───
    if (lower.startsWith('create a goal') || lower.startsWith('create goal') || lower.startsWith('add goal')) {
      const match = userText.match(/create (?:a )?goal (?:named |called )?["']?([^"']+)["']?/i);
      const title = match ? match[1].trim().replace(/[\.\?!]$/, '') : 'Strategic Objective';
      return {
        content: `I've prepared an action proposal to create the goal: **${title}**. Review and approve below to insert it into your strategic architecture.`,
        type: 'action_proposal',
        actionProposal: {
          id: generateId(),
          tool_name: 'createGoal',
          action_type: 'create_goal',
          title: `Create Strategic Goal: ${title}`,
          description: `Initialize a new outcome goal in your Strategic Architecture.`,
          parameters: {
            title,
            goal_type: 'outcome',
            time_horizon: 'annual',
            priority: 'medium',
            status: 'active',
          },
          confirmation_required: true,
        },
        sourcesUsed: ['User Request'],
      };
    }

    // ── 4. Action Request: Link Goal to Level ("Link Goal X to Level Y") ───
    if (lower.includes('link goal') && lower.includes('level')) {
      return {
        content: `I've prepared an action proposal to link the goal to your Development Level requirement. Please confirm below.`,
        type: 'action_proposal',
        actionProposal: {
          id: generateId(),
          tool_name: 'updateGoal',
          action_type: 'update_goal',
          title: `Link Goal to Level Requirement`,
          description: `Associate Goal with Development Level progression criteria.`,
          parameters: {
            id: 'goal-target',
            level_id: 'level-target',
          },
          confirmation_required: true,
        },
        sourcesUsed: ['Development Levels', 'Strategic Goals'],
      };
    }

    // ── 5. Action Request: Archive Project ("Archive Project X") ───
    if (lower.startsWith('archive project') || lower.includes('archive project')) {
      const match = userText.match(/archive project (?:named |called )?["']?([^"']+)["']?/i);
      const projectName = match ? match[1].trim().replace(/[\.\?!]$/, '') : 'Active Project';
      const existingProject = Array.isArray(data.projects)
        ? data.projects.find((p: any) => p.title.toLowerCase().includes(projectName.toLowerCase()))
        : null;

      return {
        content: `I've prepared an action proposal to archive project **${projectName}**. Historical records and linked activities will be preserved.`,
        type: 'action_proposal',
        actionProposal: {
          id: generateId(),
          tool_name: 'archiveProject',
          action_type: 'archive_project',
          title: `Archive Project: ${projectName}`,
          description: `Transition project status to archived without permanent data loss.`,
          target_entity: 'Project',
          target_id: existingProject ? existingProject.id : undefined,
          parameters: {
            id: existingProject ? existingProject.id : 'project-target-id',
          },
          confirmation_required: true,
        },
        sourcesUsed: ['Active Projects'],
      };
    }

    // ── 6. Query: Active Goals ("What are my active goals?") ───
    if (lower.includes('active goal') || (lower.includes('what') && lower.includes('goal'))) {
      const goals = Array.isArray(data.goals) ? data.goals.filter((g: any) => g.status === 'active') : [];
      if (goals.length === 0) {
        return {
          content: "You currently have no active Strategic Goals recorded. You can define new outcome or developmental goals in the Goals module or ask me to create one.",
          type: 'answer',
          sourcesUsed: ['Strategic Goals (0 active)'],
        };
      }
      const list = goals.map((g: any, i: number) => `${i + 1}. **${g.title}** (${g.time_horizon}, ${g.priority} priority)`).join('\n');
      return {
        content: `Here are your currently active Strategic Goals:\n\n${list}`,
        type: 'answer',
        sourcesUsed: [`Strategic Goals (${goals.length} active)`],
      };
    }

    // ── 7. Query: Level Skills ("What Skills are required for my current Level?") ───
    if (lower.includes('skill')) {
      const skills = Array.isArray(data.skills) ? data.skills : [];
      const levels = Array.isArray(data.levels) ? data.levels : [];
      const currentLevel = levels.find((l: any) => l.status === 'current');

      if (skills.length === 0) {
        return {
          content: "There are currently no skills linked as requirements to your current Development Level.",
          type: 'answer',
          sourcesUsed: ['Skill Matrix', 'Development Levels'],
        };
      }

      const list = skills.map((s: any, i: number) => `${i + 1}. **${s.name}** — Current: *${s.current_proficiency}*, Target: *${s.target_proficiency}*`).join('\n');
      return {
        content: `Here are the skills associated with your development requirements${currentLevel ? ` for **${currentLevel.name}**` : ''}:\n\n${list}`,
        type: 'answer',
        sourcesUsed: [`Skill Matrix (${skills.length} skills)`, `Development Levels`],
      };
    }

    // ── 8. Query: Current Level ("What is my current Professional Level?") ───
    if (lower.includes('level') && (lower.includes('current') || lower.includes('what') || lower.includes('state') || lower.includes('professional'))) {
      const levels = Array.isArray(data.levels) ? data.levels : [];
      const currentLevel = levels.find((l: any) => l.status === 'current');
      const lifeAreaName = data.lifeAreaName || 'your life area';

      if (!currentLevel) {
        return {
          content: `You currently have no active 'Current' Development Level set in ${lifeAreaName}. Levels define sequential milestones from Level 1 upwards.`,
          type: 'answer',
          sourcesUsed: ['Development Levels'],
        };
      }

      return {
        content: `Your current Development Level in **${lifeAreaName}** is **${currentLevel.name}** (Order ${currentLevel.display_order}).`,
        type: 'answer',
        sourcesUsed: [`Development Levels (${currentLevel.name})`],
      };
    }

    // ── 9. Query: Projects connected to Goal ("Which Projects are connected to my Goal?") ───
    if (lower.includes('project') && (lower.includes('goal') || lower.includes('connected') || lower.includes('linked'))) {
      const projects = Array.isArray(data.projects) ? data.projects : [];
      if (projects.length === 0) {
        return {
          content: "No active projects are currently linked to that strategic goal. You can link existing projects in the Projects module.",
          type: 'answer',
          sourcesUsed: ['Active Projects', 'Strategic Goals'],
        };
      }

      const list = projects.map((p: any, i: number) => `${i + 1}. **${p.title}** (Status: ${p.status}, Priority: ${p.priority})`).join('\n');
      return {
        content: `Here are the projects linked to your strategic goals:\n\n${list}`,
        type: 'answer',
        sourcesUsed: [`Active Projects (${projects.length} found)`, 'Strategic Goals'],
      };
    }

    // ── 10. Query: Progress Analysis ("Why have I not progressed recently?") ───
    if (lower.includes('why') && (lower.includes('progress') || lower.includes('not progressed') || lower.includes('slow'))) {
      const activities = Array.isArray(data.activities) ? data.activities : [];
      const tasks = Array.isArray(data.tasks) ? data.tasks : [];
      const projects = Array.isArray(data.projects) ? data.projects : [];

      if (activities.length === 0 && tasks.length === 0) {
        return {
          content: "I don't have enough recorded execution data (daily activities or completed tasks) in the recent period to determine progression bottlenecks accurately. Log daily activities or task completions to generate deeper analysis.",
          type: 'analysis',
          sourcesUsed: ['Daily Activities (0 logs)', 'Tasks (0 recent)'],
        };
      }

      return {
        content: `Based on your recent execution data (${activities.length} activity logs, ${tasks.length} tasks, and ${projects.length} projects):\n\n- **Execution Volume**: Work appears concentrated on immediate operational tasks rather than strategic level requirements.\n- **Project Focus**: You have ${projects.filter((p: any) => p.status === 'active').length} active projects simultaneously.\n- **Recommendation**: Consider reducing active concurrent projects and focusing on direct Level milestones.`,
        type: 'analysis',
        sourcesUsed: [`Daily Activities (${activities.length} logs)`, `Tasks (${tasks.length} items)`, `Active Projects (${projects.length} projects)`],
      };
    }

    // ── 11. Unrelated Queries / General Questions ───
    if (lower.includes('weather') || lower.includes('capital of') || lower.includes('joke') || lower.includes('recipe')) {
      return {
        content: "I am your Aura Leveling intelligence layer, focused specifically on your strategic vision, goals, development levels, skills, active projects, tasks, and daily execution. I do not have access to general web knowledge or unrelated external topics.",
        type: 'answer',
        sourcesUsed: ['Personal OS Core'],
      };
    }

    // ── 12. Default Synthesis ───
    return {
      content: `I've analyzed your Personal OS context. You can ask me to inspect your Goals, check Development Levels, review Skills, audit Projects, examine daily logs, or tell me 'Remember that...' to record permanent personal preferences.`,
      type: 'answer',
      sourcesUsed: ['Personal OS Core'],
    };
  }
}
