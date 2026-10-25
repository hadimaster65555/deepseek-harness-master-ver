/**
 * TypeScript client SDK for the Master Harness runtime: spawn the
 * same-version `mh --profile sdk` runtime as a subprocess and drive agent
 * turns over stdio JSON-RPC. `MasterHarness` is the high-level run API;
 * `HarnessClient` is the lower-level protocol client. A pure library — it
 * registers nothing on a Cordis context; named profiles and ordered patch
 * files customize the runtime process it spawns.
 *
 * @module @master-harness/sdk-client
 */

export { MasterHarness, HarnessSession, validatedSessionEvent } from './api.ts'
export type { RunOptions } from './api.ts'
export {
  HarnessClient,
  RequestTimeoutError,
  SdkProtocolError,
  TransportClosedError,
} from './client.ts'
export type { NotificationSubscription } from './client.ts'
export { JsonRpcResponseError } from '@master-harness/sdk-protocol'
export type {
  ContentBlock,
  SdkPromptContentBlock,
  SdkUserQuestionAnswer,
  SdkUserQuestionRequest,
  MasterHarnessOptions,
  HarnessClientOptions,
  HarnessNotification,
  NotificationFilter,
  RunResult,
} from './types.ts'
