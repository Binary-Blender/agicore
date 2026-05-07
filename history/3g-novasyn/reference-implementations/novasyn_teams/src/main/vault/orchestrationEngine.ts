// --- Orchestration Engine (Teams) -------------------------------------------
// Lightweight orchestration support for NovaSyn Teams.
// Allows Teams to participate in cross-app orchestrations triggered by
// team events (new message, channel created, etc.)

import { sendMacroRequest, checkMacroResponse } from './queueWatcher';
import { vaultStore } from './vaultService';

export interface OrchestrationStep {
  id: string;
  targetApp: string;
  macro: string;
  input: any;
  dependsOn?: string; // ID of a previous step whose output feeds into this step's input
}

export interface OrchestrationPlan {
  id: string;
  name: string;
  description: string;
  steps: OrchestrationStep[];
  trigger?: string; // 'on_message' | 'on_channel_created' | 'on_member_joined' | 'manual'
  createdAt: string;
}

export interface OrchestrationResult {
  planId: string;
  stepResults: Array<{
    stepId: string;
    status: 'completed' | 'failed' | 'skipped';
    output?: any;
    error?: string;
  }>;
  status: 'completed' | 'partial' | 'failed';
  completedAt: string;
}

/**
 * Execute an orchestration plan step-by-step.
 * Each step sends a macro request to the target app and waits for a response.
 * Step outputs can be chained via dependsOn.
 */
export async function executeOrchestration(plan: OrchestrationPlan): Promise<OrchestrationResult> {
  const stepOutputs: Record<string, any> = {};
  const stepResults: OrchestrationResult['stepResults'] = [];

  for (const step of plan.steps) {
    // Resolve input — if dependsOn is set, merge previous step's output
    let resolvedInput = { ...step.input };
    if (step.dependsOn && stepOutputs[step.dependsOn]) {
      resolvedInput = { ...resolvedInput, previousOutput: stepOutputs[step.dependsOn] };
    }

    try {
      const response = await sendMacroRequest(step.targetApp, step.macro, resolvedInput);

      if (response.status === 'completed') {
        stepOutputs[step.id] = response.output;
        stepResults.push({
          stepId: step.id,
          status: 'completed',
          output: response.output,
        });
      } else {
        stepResults.push({
          stepId: step.id,
          status: 'failed',
          error: response.error,
        });
        // Continue with remaining steps — don't abort the whole plan
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      stepResults.push({
        stepId: step.id,
        status: 'failed',
        error: errorMessage,
      });
    }
  }

  const allCompleted = stepResults.every((r) => r.status === 'completed');
  const allFailed = stepResults.every((r) => r.status === 'failed');

  const result: OrchestrationResult = {
    planId: plan.id,
    stepResults,
    status: allCompleted ? 'completed' : allFailed ? 'failed' : 'partial',
    completedAt: new Date().toISOString(),
  };

  // Optionally save orchestration result to vault
  try {
    vaultStore({
      itemType: 'note',
      title: `Orchestration: ${plan.name}`,
      content: JSON.stringify(result, null, 2),
      metadata: { orchestrationPlanId: plan.id, status: result.status },
      tags: ['orchestration', 'teams'],
    });
  } catch (err) {
    console.error('Failed to save orchestration result to vault:', err);
  }

  return result;
}
