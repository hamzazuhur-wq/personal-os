import { CaptureType } from '../../types/capture.types';

/**
 * AI ARCHITECTURE HOOK — FOUNDATION ONLY
 * 
 * In future modules, this service connects to local or remote AI models
 * for automatic categorization, summarization, entity extraction, and intelligent life reviews.
 * 
 * For Module 01, this provides the exact type signatures and architecture hook
 * without making premature paid API requests.
 */

export interface AIClassificationResult {
  suggested_type: CaptureType;
  confidence: number;
  extracted_keywords: string[];
  suggested_project?: string;
  suggested_priority?: 'low' | 'medium' | 'high' | 'urgent';
}

export class AIServiceHook {
  /**
   * Architecture hook for future AI text classification.
   */
  static async classifyCaptureText(text: string): Promise<AIClassificationResult | null> {
    // Intentionally a placeholder for future Module expansion
    if (!text || text.trim().length === 0) return null;
    return null;
  }

  /**
   * Architecture hook for future voice-to-text transcript processing.
   */
  static async processVoiceAudioPlaceholder(_audioBlob: Blob): Promise<string | null> {
    return null;
  }
}
