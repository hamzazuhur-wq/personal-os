export class ConversationTitleService {
  /**
   * Generates a concise 3-7 word title from the user prompt using fast deterministic heuristics.
   * Avoids expensive/redundant LLM round-trips while delivering clean titles.
   */
  static generateTitleFromPrompt(userPrompt: string): string {
    if (!userPrompt || !userPrompt.trim()) {
      return 'General Intelligence Session';
    }

    const clean = userPrompt.trim().replace(/\s+/g, ' ');
    const lower = clean.toLowerCase();

    // 1. Goal Creation / Strategy
    if (lower.includes('create a goal') || lower.includes('create goal') || lower.includes('new goal')) {
      const match = clean.match(/goal (?:named |called )?["']?([^"'\.\n]+)["']?/i);
      if (match && match[1]) {
        return this.formatTitle(`Goal: ${match[1].trim()}`);
      }
      return 'Strategic Goal Planning';
    }

    // 2. Project Planning / Review
    if (lower.includes('project')) {
      const match = clean.match(/project (?:named |called )?["']?([^"'\.\n]+)["']?/i);
      if (match && match[1]) {
        return this.formatTitle(`Project: ${match[1].trim()}`);
      }
      return 'Project Review & Strategy';
    }

    // 3. Level Progression
    if (lower.includes('level')) {
      return 'Development Level Progression';
    }

    // 4. Skill Matrix
    if (lower.includes('skill')) {
      return 'Skill Matrix Assessment';
    }

    // 5. Memory / Preferences
    if (lower.startsWith('remember that') || lower.startsWith('remember:')) {
      const pref = clean.replace(/^remember\s+(that\s*)?:?/i, '').trim();
      return this.formatTitle(`Preference: ${pref}`);
    }

    // 6. Progress / Analysis
    if (lower.includes('why') && (lower.includes('progress') || lower.includes('slow'))) {
      return 'Execution Bottleneck Analysis';
    }

    if (lower.includes('weekly') || lower.includes('week')) {
      return 'Weekly Execution Overview';
    }

    // 7. General Sentence Extraction (Capitalized, 3-6 words)
    const words = clean
      .replace(/[^\w\s]/g, '')
      .split(' ')
      .filter((w) => w.length > 0);

    if (words.length <= 6) {
      return this.capitalizeWords(words.join(' '));
    }

    // Pick top 4-5 words
    const slice = words.slice(0, 5).join(' ');
    return this.capitalizeWords(slice);
  }

  private static formatTitle(text: string): string {
    const words = text.split(' ').filter(Boolean);
    if (words.length > 7) {
      return words.slice(0, 7).join(' ');
    }
    return text;
  }

  private static capitalizeWords(text: string): string {
    return text
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
}
