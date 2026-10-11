import { AIConversationCategory } from '../../../types/ai.types';

export class ConversationClassificationService {
  /**
   * Maps user prompts / conversation content to one of the 10 controlled categories.
   */
  static classify(userPrompt: string): AIConversationCategory {
    if (!userPrompt || !userPrompt.trim()) return 'general';
    const text = userPrompt.toLowerCase();

    if (text.includes('goal') || text.includes('objective') || text.includes('milestone')) {
      return 'goals';
    }

    if (text.includes('level') || text.includes('progression') || text.includes('requirement')) {
      return 'levels';
    }

    if (text.includes('skill') || text.includes('proficiency') || text.includes('competency')) {
      return 'skills';
    }

    if (text.includes('project') || text.includes('initiative') || text.includes('deliverable')) {
      return 'projects';
    }

    if (text.includes('why') || text.includes('analyze') || text.includes('review') || text.includes('bottleneck') || text.includes('audit')) {
      return 'analysis';
    }

    if (text.includes('plan') || text.includes('schedule') || text.includes('week') || text.includes('organize')) {
      return 'planning';
    }

    if (text.includes('career') || text.includes('job') || text.includes('salary') || text.includes('promotion') || text.includes('industry')) {
      return 'career';
    }

    if (text.includes('reflect') || text.includes('journal') || text.includes('thought') || text.includes('feel') || text.includes('retrospective')) {
      return 'reflection';
    }

    if (text.includes('health') || text.includes('fitness') || text.includes('habit') || text.includes('personal') || text.includes('sleep')) {
      return 'personal';
    }

    return 'general';
  }
}
