import type { PayloadAction } from '@reduxjs/toolkit';

export interface ThagaMetaData {
  thaga: true;
  id: string;
  cancelled?: boolean;
  failed?: boolean;
  finished?: boolean;
  /**
   * Per-action timeout in milliseconds. Set via the `timeoutMs` option on
   * `createThagaAction`. Overrides the middleware-level `timeoutMs` default.
   */
  timeoutMs?: number;
}

export interface SerializedError {
  name?: string;
  message?: string;
  stack?: string;
  code?: string;
}

function stringifyReason(reason: unknown): string {
  if (typeof reason === 'string') return reason;
  if (reason instanceof Error) return reason.message;
  try {
    return JSON.stringify(reason) ?? String(reason);
  } catch {
    return Object.prototype.toString.call(reason);
  }
}

export class ThagaCancelledError extends Error {
  override name = 'ThagaCancelledError';
  constructor(public readonly reason?: unknown) {
    super(
      reason === undefined
        ? 'Thaga action was cancelled'
        : `Thaga action was cancelled: ${stringifyReason(reason)}`,
    );
  }
}

export class ThagaTimeoutError extends Error {
  override name = 'ThagaTimeoutError';
  constructor(public readonly timeoutMs: number) {
    super(`Thaga action timed out after ${timeoutMs}ms`);
  }
}

/**
 * Phantom property carrier used to thread a thaga worker's return type
 * through to `dispatch()`. The property is never set at runtime — it exists
 * only so the compiler can recover `ReturnPayload` from the initiator action.
 */
export const THAGA_RETURN: unique symbol = Symbol.for(
  '@hvish/redux-thaga/return',
);
export type THAGA_RETURN = typeof THAGA_RETURN;

/**
 * A thaga initiator action. Identical at runtime to a `PayloadAction` with
 * `ThagaMetaData`, but carries a phantom `ReturnPayload` type that
 * `ThagaDispatch` reads to infer the dispatched Promise's value type.
 */
export type ThagaInitiatorAction<
  Payload,
  ReturnPayload,
  Type extends string = string,
> = PayloadAction<Payload, Type, ThagaMetaData> & {
  readonly [THAGA_RETURN]?: ReturnPayload;
};

export interface ThagaPromise<T> extends Promise<T> {
  /**
   * Signal that the caller no longer cares about this thaga.
   * Dispatches a `cancelled` action with the same correlation id and rejects
   * the promise with a `ThagaCancelledError`. Does NOT stop the saga worker —
   * stopping the work is the saga author's responsibility (e.g. via
   * `takeLatest` or `race`).
   */
  cancel(reason?: unknown): void;
}
