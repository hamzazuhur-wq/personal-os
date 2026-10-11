import { ContextRoute, UserIntentType, AIMemoryType } from '../../../types/ai.types';

export class ContextRouter {
  /**
   * Evaluates user prompt and returns a bounded, specific context routing object.
   */
  static route(userPrompt: string, availableLifeAreaNames: string[] = []): ContextRoute {
    const text = userPrompt.toLowerCase();
    const sources: ContextRoute['sources'] = [];
    const memoryTypes: AIMemoryType[] = [];
    let intent: UserIntentType = 'query';

    // 1. Intent Classification
    if (text.startsWith('remember that') || text.startsWith('remember:') || text.startsWith('save memory')) {
      intent = 'memory_command';
    } else if (text.startsWith('create') || text.startsWith('add') || text.startsWith('archive') || text.startsWith('link') || text.startsWith('update')) {
      intent = 'action_request';
    } else if (text.includes('why') || text.includes('analyze') || text.includes('review') || text.includes('progress') || text.includes('audit')) {
      intent = 'analysis';
    } else if (text.includes('plan') || text.includes('schedule') || text.includes('organize')) {
      intent = 'planning';
    }

    // 2. Domain Relevance Identification
    if (text.includes('vision') || text.includes('long term') || text.includes('life area')) {
      sources.push('vision', 'life_areas');
    }
    if (text.includes('goal') || text.includes('objective') || text.includes('milestone')) {
      sources.push('goals');
    }
    if (text.includes('level') || text.includes('progression') || text.includes('requirement')) {
      sources.push('levels');
    }
    if (text.includes('skill') || text.includes('proficiency') || text.includes('capability')) {
      sources.push('skills');
    }
    if (text.includes('project') || text.includes('initiative') || text.includes('work stream')) {
      sources.push('projects');
    }
    if (text.includes('task') || text.includes('todo') || text.includes('action')) {
      sources.push('tasks');
    }
    if (text.includes('activity') || text.includes('log') || text.includes('time') || text.includes('day') || text.includes('daily')) {
      sources.push('activities');
    }
    if (text.includes('week') || text.includes('weekly')) {
      sources.push('weekly');
    }
    // Module 08 Final: Development Points domain
    if (text.includes('point') || text.includes('score') || text.includes('dev points')) {
      sources.push('development');
    }
    // Module 09: Review & Analytics domain — period questions and accomplishment
    // reviews route to the same analytics service the dashboard uses.
    if (
      text.includes('review') ||
      text.includes('analytics') ||
      text.includes('accomplish') ||
      text.includes('what did i') ||
      text.includes('how many point') ||
      text.includes('earned')
    ) {
      if (!sources.includes('review')) sources.push('review');
      if (!sources.includes('development')) sources.push('development');
      if (!sources.includes('goals')) sources.push('goals');
      if (!sources.includes('activities')) sources.push('activities');
    }

    // For broad strategic or progress analysis queries, pull the execution triangle
    if (intent === 'analysis' || intent === 'planning' || text.includes('how am i doing') || text.includes('status')) {
      if (!sources.includes('goals')) sources.push('goals');
      if (!sources.includes('projects')) sources.push('projects');
      if (!sources.includes('levels')) sources.push('levels');
      if (!sources.includes('activities')) sources.push('activities');
      if (!sources.includes('tasks')) sources.push('tasks');
      if (!sources.includes('development')) sources.push('development');
    }

    // Default fallback: if no domain mentioned, fetch top-level vision and goals
    if (sources.length === 0 && intent !== 'memory_command') {
      sources.push('goals', 'levels', 'projects');
    }

    // 3. Memory Category Routing
    if (text.includes('prefer') || text.includes('preference') || text.includes('planning') || intent === 'planning') {
      memoryTypes.push('preference', 'interaction_preference');
    }
    if (text.includes('constraint') || text.includes('cannot') || text.includes('limit') || text.includes('rule')) {
      memoryTypes.push('constraint');
    }
    if (text.includes('decision') || text.includes('decided')) {
      memoryTypes.push('decision');
    }
    if (intent === 'analysis' || intent === 'planning') {
      memoryTypes.push('preference', 'constraint');
    }

    // 4. Life Area Matching
    let matchedAreaName: string | undefined;
    for (const name of availableLifeAreaNames) {
      if (text.includes(name.toLowerCase())) {
        matchedAreaName = name;
        break;
      }
    }

    // 5. Time Scope
    let timeScope: ContextRoute['timeScope'] = 'all';
    if (text.includes('today')) timeScope = 'today';
    else if (text.includes('this week') || text.includes('weekly')) timeScope = 'this_week';
    else if (text.includes('recent') || text.includes('last month') || text.includes('this month')) timeScope = 'recent';

    return {
      intent,
      sources,
      memoryTypes: memoryTypes.length > 0 ? memoryTypes : undefined,
      lifeAreaName: matchedAreaName,
      timeScope,
    };
  }
}
