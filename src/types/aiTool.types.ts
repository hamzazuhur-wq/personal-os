// ============================================================
// AI TOOL DEFINITIONS & EXECUTION TYPES
// ============================================================

export type ToolClassification = 'read' | 'write' | 'analysis';

export type ToolDomain =
  | 'vision'
  | 'goals'
  | 'levels'
  | 'skills'
  | 'projects'
  | 'tasks'
  | 'activities'
  | 'weekly'
  | 'memory'
  | 'development'
  | 'review'
  | 'metrics'
  | 'ideas';

export interface AIToolParameterSchema {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  enum?: string[];
}

export interface AIToolDefinition {
  name: string;
  description: string;
  classification: ToolClassification;
  domain: ToolDomain;
  confirmationRequired: boolean;
  parameters: AIToolParameterSchema[];
}

export interface AIToolResult<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface IToolExecutionContext {
  conversationId?: string;
  userId: string;
  repositories: any;
  /**
   * Module 10: session-fixed Idea id for the scoped Idea Capture agent.
   * Every idea tool execution MUST verify params.idea_id === ideaId
   * (IDEA_ID_MISMATCH otherwise) — model-supplied ids are never trusted.
   */
  ideaId?: string;
}
