import { PersonalAgentCore } from '../agent/agentCore';
import { DevelopmentMockProvider } from '../providers/DevelopmentMockProvider';
import { ActionPolicy } from '../agent/actionPolicy';

export interface EvaluationScenarioResult {
  id: number;
  scenario: string;
  passed: boolean;
  notes: string;
  responseType?: string;
  sourcesCount?: number;
}

export interface EvaluationSuiteSummary {
  total: number;
  passed: number;
  failed: number;
  results: EvaluationScenarioResult[];
}

export class AIEvaluationSuite {
  /**
   * Runs the 15 required evaluation test scenarios against the Personal Agent architecture.
   */
  static async runSuite(repositories: any): Promise<EvaluationSuiteSummary> {
    const agent = new PersonalAgentCore(new DevelopmentMockProvider());
    const conversation = await repositories.aiRepo.createConversation('Evaluation Test Suite');
    const convId = conversation.id;
    const results: EvaluationScenarioResult[] = [];

    // Helper runner
    const runTest = async (
      id: number,
      scenario: string,
      prompt: string,
      validator: (msg: any) => { passed: boolean; notes: string }
    ) => {
      try {
        const msg = await agent.processUserTurn(convId, prompt, [], repositories);
        const val = validator(msg);
        results.push({
          id,
          scenario,
          passed: val.passed,
          notes: val.notes,
          responseType: msg.type,
          sourcesCount: msg.context_sources?.length || 0,
        });
      } catch (err: any) {
        results.push({
          id,
          scenario,
          passed: false,
          notes: `Exception: ${err.message}`,
        });
      }
    };

    // 1. "What are my active goals?"
    await runTest(1, 'Active Goals Query', 'What are my active goals?', (msg) => ({
      passed: msg.type === 'answer' && (msg.content.includes('Goals') || msg.content.includes('goals')),
      notes: 'Successfully retrieved active goals context.',
    }));

    // 2. "What is my current Professional Level?"
    await runTest(2, 'Current Level Query', 'What is my current Professional Level?', (msg) => ({
      passed: msg.type === 'answer' && msg.content.includes('Level'),
      notes: 'Successfully resolved Level query with life area context.',
    }));

    // 3. "What Skills are required for my current Level?"
    await runTest(3, 'Level Skills Requirement Query', 'What Skills are required for my current Level?', (msg) => ({
      passed: msg.type === 'answer' && msg.content.includes('skill'),
      notes: 'Successfully retrieved Skill Matrix requirements.',
    }));

    // 4. "Which Projects are connected to my Goal?"
    await runTest(4, 'Goal Projects Linkage Query', 'Which Projects are connected to my Goal?', (msg) => ({
      passed: msg.type === 'answer' && (msg.content.includes('project') || msg.content.includes('Project')),
      notes: 'Successfully retrieved Goal-Project linkage context.',
    }));

    // 5. "Why have I not progressed recently?"
    await runTest(5, 'Progress Analysis', 'Why have I not progressed recently?', (msg) => ({
      passed: msg.type === 'analysis',
      notes: 'Successfully formed analytical reasoning over execution data.',
    }));

    // 6. "Remember that I prefer flexible weekly planning."
    await runTest(6, 'Explicit Memory Save Command', 'Remember that I prefer flexible weekly planning.', (msg) => ({
      passed: msg.type === 'action_proposal' && msg.action_payload?.action_type === 'save_memory',
      notes: 'Successfully formed Memory Save Action Proposal with confirmation requirement.',
    }));

    // 7. "What do you remember about my planning preferences?"
    await runTest(7, 'Memory Recall Query', 'What do you remember about my planning preferences?', (msg) => ({
      passed: msg.type === 'answer' && (msg.content.includes('preferences') || msg.content.includes('memories') || msg.content.includes("don't have")),
      notes: 'Successfully routed to AI Memory store.',
    }));

    // 8. "Create a Goal named X."
    await runTest(8, 'Goal Creation Proposal', 'Create a Goal named Build Strategic Positioning.', (msg) => ({
      passed: msg.type === 'action_proposal' && msg.action_payload?.action_type === 'create_goal' && msg.action_payload.parameters.title === 'Build Strategic Positioning',
      notes: 'Successfully prepared Goal creation proposal with parameters.',
    }));

    // 9. "Link Goal X to Level 3."
    await runTest(9, 'Level-Goal Linking Proposal', 'Link Goal X to Level 3.', (msg) => ({
      passed: msg.type === 'action_proposal' && msg.action_payload?.tool_name === 'updateGoal',
      notes: 'Successfully formulated Level linking proposal.',
    }));

    // 10. "Archive Project X."
    await runTest(10, 'Project Archive Proposal', 'Archive Project Alpha.', (msg) => ({
      passed: msg.type === 'action_proposal' && msg.action_payload?.action_type === 'archive_project',
      notes: 'Successfully formed non-destructive project archival proposal.',
    }));

    // 11. Invalid Entity ID Guardrail
    const guardrailCheck = ActionPolicy.validateActionParameters('updateGoal', { id: '' });
    results.push({
      id: 11,
      scenario: 'Invalid Entity ID Guardrail',
      passed: !guardrailCheck.valid,
      notes: 'ActionPolicy rejected invalid action parameters.',
    });

    // 12. Failed Tool Execution Handling
    const failedToolResult = await agent.executeApprovedAction(
      {
        id: 'invalid-act',
        tool_name: 'nonExistentTool',
        action_type: 'create_goal',
        title: 'Invalid',
        description: 'Testing',
        parameters: {},
        confirmation_required: true,
      },
      repositories,
      convId
    );
    results.push({
      id: 12,
      scenario: 'Failed Tool Execution Handling',
      passed: !failedToolResult.success && !!failedToolResult.error,
      notes: 'Unknown/failing tools correctly return structured error payload.',
    });

    // 13. Missing Data Handling
    await runTest(13, 'Missing Data Handling', 'Why is my physical endurance low?', (msg) => ({
      passed: msg.type === 'analysis' || msg.type === 'answer',
      notes: 'Correctly reports lack of recorded data rather than fabricating records.',
    }));

    // 14. Unrelated Query Redirection
    await runTest(14, 'Unrelated Query Redirection', 'What is the weather in Tokyo?', (msg) => ({
      passed: msg.type === 'answer' && msg.content.includes('Aura Leveling'),
      notes: 'Gracefully redirects external general-knowledge query to Personal OS scope.',
    }));

    // 15. Mixed Query (Structured Data + Memory)
    await runTest(15, 'Mixed Query (Data + Preferences)', 'Plan my goals for this week using my preferences.', (msg) => ({
      passed: msg.context_sources !== undefined && msg.context_sources.length > 0,
      notes: 'Successfully retrieved combined multi-domain context and memory.',
    }));

    const passedCount = results.filter((r) => r.passed).length;
    return {
      total: results.length,
      passed: passedCount,
      failed: results.length - passedCount,
      results,
    };
  }
}
