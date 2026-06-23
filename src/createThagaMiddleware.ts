import { Dispatch, Middleware } from '@reduxjs/toolkit';
import { thagaConfig } from './config';
import { isThagaAction } from './utils';
import {
  SerializedError,
  ThagaCancelledError,
  ThagaMetaData,
  ThagaPromise,
  ThagaTimeoutError,
} from './types';

export interface CreateThagaMiddlewareOptions {
  /** Unique id generator function; used to correlate initiator and terminal actions. */
  getId?: () => string;
  /**
   * Optional auto-cleanup: if a thaga has not terminated within `timeoutMs`,
   * the pending Promise is rejected with `ThagaTimeoutError` and its slot is
   * freed. Defaults to undefined (no timeout — sagas may legitimately run for
   * a long time).
   */
  timeoutMs?: number;
}

interface PendingEntry {
  initiatorType: string;
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
  timer?: ReturnType<typeof setTimeout>;
}

export function createThagaMiddleware<DispatchExt, S, D extends Dispatch>({
  getId,
  timeoutMs,
}: CreateThagaMiddlewareOptions = {}): Middleware<DispatchExt, S, D> {
  const pending = new Map<string, PendingEntry>();

  if (getId) {
    thagaConfig.setIdFn(getId);
  }

  function clear(id: string): PendingEntry | undefined {
    const entry = pending.get(id);
    if (!entry) return undefined;
    if (entry.timer !== undefined) clearTimeout(entry.timer);
    pending.delete(id);
    return entry;
  }

  return (api) => (next) => (action) => {
    const result = next(action);

    if (!isThagaAction(action)) return result;

    const { id, cancelled, failed, finished } = action.meta;

    if (cancelled || failed || finished) {
      const entry = clear(id);
      if (!entry) return result;

      if (finished) {
        entry.resolve(action.payload);
      } else if (cancelled) {
        entry.reject(new ThagaCancelledError(action.payload));
      } else {
        // failed: payload is a SerializedError
        entry.reject(action.payload as SerializedError);
      }

      return result;
    }

    const initiatorType = action.type;
    const effectiveTimeoutMs = action.meta.timeoutMs ?? timeoutMs;

    const promise = new Promise<unknown>((resolve, reject) => {
      const entry: PendingEntry = { initiatorType, resolve, reject };
      if (effectiveTimeoutMs !== undefined) {
        entry.timer = setTimeout(() => {
          if (pending.get(id) === entry) {
            pending.delete(id);
            reject(new ThagaTimeoutError(effectiveTimeoutMs));
          }
        }, effectiveTimeoutMs);
      }
      pending.set(id, entry);
    }) as ThagaPromise<unknown>;

    promise.cancel = (reason?: unknown) => {
      if (!pending.has(id)) return;
      api.dispatch({
        type: `${initiatorType}/cancelled`,
        payload: reason,
        meta: {
          thaga: true,
          id,
          cancelled: true,
        } satisfies ThagaMetaData,
      });
    };

    return promise;
  };
}
