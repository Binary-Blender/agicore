// Runner adapter — abstracts "how a workflow is executed" from the UI.
//
// The factory chooses the right adapter for the environment. Today there's
// only the in-renderer StubRunner; tomorrow the agicore-cli adapter joins
// it (CliRunner — spawn the binary, parse the listening port, open a
// websocket, pipe events). The Studio's UI never knows which one it has.

import type { QcDecision, RunEvent } from '../../types/run';
import type { Workflow } from '../../types/workflow';
import { StubRunner } from './stub-runner';

export interface RunnerAdapter {
  /** Begin executing the workflow. Events arrive via onEvent. */
  start(workflow: Workflow, onEvent: (e: RunEvent) => void): void;

  /** Resume a paused QC checkpoint with the human's decision. */
  resumeQc(decision: QcDecision): void;

  /** Cancel the in-flight run. Safe to call even when nothing is running. */
  cancel(): void;
}

export function makeRunner(): RunnerAdapter {
  // When CliRunner lands, choose between them based on a setting or env probe.
  // For MVP we always use the stub.
  return new StubRunner();
}
