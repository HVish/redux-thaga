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

export class ThagaCancelledError extends Error {
  override name = 'ThagaCancelledError';
  constructor(public readonly reason?: unknown) {
    super(
      reason === undefined
        ? 'Thaga action was cancelled'
        : `Thaga action was cancelled: ${String(reason)}`,
    );
  }
}

export class ThagaTimeoutError extends Error {
  override name = 'ThagaTimeoutError';
  constructor(public readonly timeoutMs: number) {
    super(`Thaga action timed out after ${timeoutMs}ms`);
  }
}

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
