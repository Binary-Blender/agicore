// Runner adapter — abstracts "how a workflow is executed" from the UI.
//
// The factory chooses the right adapter for the environment. Today there's
// only the in-renderer StubRunner; tomorrow the agicore-cli adapter joins
// it (CliRunner — spawn the binary, parse the listening port, open a
// websocket, pipe events). The Studio's UI never knows which one it has.

import type { DebugResume, QcDecision, RunEvent } from '../../types/run';
import type { Workflow } from '../../types/workflow';
import { StubRunner } from './stub-runner';

export interface RunOptions {
  /** Node ids that should pause execution before they fire. */
  breakpoints?: Set<string>;
}

export interface RunnerAdapter {
  /** Begin executing the workflow. Events arrive via onEvent. */
  start(
    workflow: Workflow,
    onEvent: (e: RunEvent) => void,
    options?: RunOptions,
  ): void;

  /** Resume a paused QC checkpoint with the human's decision. */
  resumeQc(decision: QcDecision): void;

  /** Resume from a breakpoint pause. mode === 'step' pauses again
   *  before the next node fires; mode === 'continue' runs until the
   *  next breakpoint or end-of-workflow. */
  resumeDebug(mode: DebugResume): void;

  /** Cancel the in-flight run. Safe to call even when nothing is running. */
  cancel(): void;
}

export function makeRunner(): RunnerAdapter {
  // When CliRunner lands, choose between them based on a setting or env probe.
  // For now we always use the stub.
  return new StubRunner();
}
