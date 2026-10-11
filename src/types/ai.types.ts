// ============================================================
// AI CONVERSATION & MESSAGE TYPES
// ============================================================

export type AIMessageRole = 'user' | 'assistant' | 'system';

export type AIMessageType =
  | 'answer'
  | 'analysis'
  | 'recommendation'
  | 'action_proposal'
  | 'action_result'
  | 'error';

export type ActionStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'executed'
  | 'failed';

export interface AIActionProposalPayload {
  id: string;
  tool_name: string;
  action_type:
    | 'create_goal'
    | 'update_goal'
    | 'archive_goal'
    | 'create_project'
    | 'update_project'
    | 'archive_project'
    | 'create_skill'
    | 'update_skill_proficiency'
    | 'create_task'
    | 'complete_task'
    | 'log_activity'
    | 'save_memory'
    | 'archive_memory'
    // Module 10: scoped Idea edits (Idea Capture agent only)
    | 'update_idea_title'
    | 'append_to_idea'
    | 'insert_into_idea'
    | 'replace_idea_section'
    | 'remove_idea_section'
    | 'reorder_idea_section'
    | 'rename_idea_section'
    | 'create_idea_section'
    | 'rewrite_idea_content';
  title: string;
  description: string;
  target_entity?: string;
  target_id?: string;
  parameters: Record<string, any>;
  confirmation_required: boolean;
}

export type AIConversationCategory =
  | 'planning'
  | 'goals'
  | 'levels'
  | 'skills'
  | 'projects'
  | 'analysis'
  | 'reflection'
  | 'career'
  | 'personal'
  | 'general';

export interface AIConversation {
  id: string;
  user_id: string;
  title: string;
  category: AIConversationCategory;
  group_id?: string | null;
  pinned: boolean;
  status: 'active' | 'archived';
  provider?: string;
  model?: string;
  message_count?: number;
  /** Module 10: when set, this conversation is scoped to one Idea (capture id). */
  idea_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AIConversationGroup {
  id: string;
  user_id: string;
  name: string;
  color?: string;
  sort_order: number;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface AIMessageMetadata {
  model_used?: string;
  provider_used?: string;
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
  latency_ms?: number;
  fallback_used?: boolean;
  fallback_model?: string;
  estimated_cost?: number;
}

export interface AIMessage {
  id: string;
  conversation_id: string;
  role: AIMessageRole;
  content: string;
  type: AIMessageType;
  context_sources?: string[]; // Transparency list e.g. ["Professional Vision", "2 Active Goals"]
  action_payload?: AIActionProposalPayload;
  action_status?: ActionStatus;
  isStreaming?: boolean;
  metadata?: AIMessageMetadata;
  created_at: string;
}

// ============================================================
// AI SETTINGS & CONFIGURATION TYPES
// ============================================================

export type AIProviderType = 'openrouter' | 'mock';
export type AIModelSelectionMode = 'auto' | 'manual' | 'free_only';
export type AIRoutingProfile = 'cost_optimized' | 'balanced' | 'quality_first' | 'free_only' | 'manual';
export type AIContextDepth = 'minimal' | 'standard' | 'deep';
export type AIActionPolicyMode = 'read_only' | 'ask_before_write';

export interface AISettings {
  id: string; // 'default'
  user_id: string;

  // A. Provider
  provider: AIProviderType;
  endpoint: string; // default '/api/ai' (or OpenRouter base)
  custom_headers?: Record<string, string>;
  active_connection_id?: string; // Module 10: multi-provider active connection

  // B. Model
  model_mode: AIModelSelectionMode;
  selected_model: string;
  fallback_model: string;
  fallback_enabled: boolean;

  // C. Routing
  routing_profile: AIRoutingProfile;

  // D. Generation
  temperature: number; // 0.0 - 1.0 (default: 0.3)
  max_output_tokens: number; // 256 - 4096 (default: 1500)
  streaming: boolean; // default: true

  // E. Context
  auto_context: boolean; // default: true
  context_depth: AIContextDepth; // default: 'standard'
  max_retrieved_records: number; // 5 - 50 (default: 20)
  include_activities: boolean; // default: true
  include_archived_data: boolean; // default: false
  include_memories: boolean; // default: true

  // F. Memory
  memory_retrieval_enabled: boolean; // default: true
  memory_candidate_detection: boolean; // default: true
  always_require_confirmation: boolean; // default: true

  // G. Actions & Safety
  action_policy: AIActionPolicyMode; // default: 'ask_before_write'
  never_allow_destructive: boolean; // default: true (hardcoded safeguard)

  // H. Privacy
  show_context_sources: boolean; // default: true
  show_context_summary: boolean; // default: false
  minimize_context: boolean; // default: false
  conversation_retention_days: number; // 0 = infinite (default: 0)

  // I. Usage & Metrics
  total_requests: number;
  failed_requests: number;
  fallback_count: number;
  last_used_provider?: string;
  last_used_model?: string;
  last_connected_at?: string;

  updated_at: string;
}

export interface ModelCapabilityMeta {
  id: string;
  name: string;
  provider: string;
  contextWindow: number;
  isFree: boolean;
  supportsTools: boolean;
  supportsStructuredOutput: boolean;
  supportsStreaming: boolean;
  pricingDescription?: string;
  pricing?: {
    promptPerMillion: number;
    completionPerMillion: number;
  };
}

// ============================================================
// REAL USAGE & REQUEST LOGS
// ============================================================

export interface AIRequestLog {
  id: string;
  conversation_id?: string;
  timestamp: string;
  provider: string;
  model: string;
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
  latency_ms: number;
  status: 'success' | 'failed';
  error_message?: string;
  fallback_used: boolean;
  fallback_model?: string;
  estimated_cost?: number;
}

export interface AIUsagePeriodSummary {
  period: 'today' | 'this_week' | 'this_month' | 'all';
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  fallback_requests: number;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  has_untracked_tokens: boolean;
  estimated_cost: number | null; // null if pricing is unknown
  cost_unavailable: boolean;
}

// ============================================================
// DTOs & FILTERS
// ============================================================

export type CreateAIConversationDTO = Partial<
  Omit<AIConversation, 'id' | 'user_id' | 'created_at' | 'updated_at'>
>;

export type UpdateAIConversationDTO = Partial<
  Omit<AIConversation, 'id' | 'user_id' | 'created_at' | 'updated_at'>
>;

export type CreateAIConversationGroupDTO = Omit<
  AIConversationGroup,
  'id' | 'user_id' | 'created_at' | 'updated_at'
>;

export type UpdateAIConversationGroupDTO = Partial<
  Omit<AIConversationGroup, 'id' | 'user_id' | 'created_at' | 'updated_at'>
>;

export type UpdateAISettingsDTO = Partial<
  Omit<AISettings, 'id' | 'user_id' | 'updated_at'>
>;

export interface ConversationFilter {
  status?: 'active' | 'archived' | 'all';
  category?: AIConversationCategory | 'all';
  group_id?: string | 'all' | 'none';
  pinned?: boolean;
  searchQuery?: string;
}

// ============================================================
// AI MEMORY TYPES
// ============================================================

export type AIMemoryType =
  | 'preference'
  | 'constraint'
  | 'decision'
  | 'context'
  | 'interaction_preference';

export interface AIMemory {
  id: string;
  user_id: string;
  type: AIMemoryType;
  content: string;
  status: 'active' | 'archived';
  source: 'explicit_user' | 'confirmed_prompt' | 'system';
  confidence: number; // 0.0 to 1.0
  last_confirmed_at: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export type CreateAIMemoryDTO = Omit<
  AIMemory,
  'id' | 'user_id' | 'created_at' | 'updated_at' | 'last_confirmed_at'
>;

// ============================================================
// AI AUDIT TYPES
// ============================================================

export interface AIAuditEvent {
  id: string;
  conversation_id?: string;
  timestamp: string;
  tool_name: string;
  action_type: 'read' | 'write' | 'archive' | 'memory';
  target_type: string;
  target_id?: string;
  parameters_summary: string;
  confirmation_required: boolean;
  confirmation_status: 'not_required' | 'confirmed' | 'rejected' | 'auto_approved';
  result_status: 'success' | 'failure';
  error_code?: string;
}

export type CreateAIAuditEventDTO = Omit<AIAuditEvent, 'id' | 'timestamp'>;

// ============================================================
// CONTEXT ROUTING & BUILDING TYPES
// ============================================================

export type UserIntentType =
  | 'query'
  | 'analysis'
  | 'strategic_review'
  | 'planning'
  | 'action_request'
  | 'memory_command'
  | 'general';

export interface ContextRoute {
  intent: UserIntentType;
  sources: Array<
    | 'vision'
    | 'life_areas'
    | 'goals'
    | 'levels'
    | 'skills'
    | 'projects'
    | 'tasks'
    | 'activities'
    | 'weekly'
    | 'development'
    | 'review'
  >;
  memoryTypes?: AIMemoryType[];
  lifeAreaName?: string;
  timeScope?: 'today' | 'this_week' | 'recent' | 'all';
}

export interface BoundedContextPayload {
  summary: string;
  sourcesUsed: string[];
  rawStructuredData: Record<string, any>;
  relevantMemories: AIMemory[];
}
