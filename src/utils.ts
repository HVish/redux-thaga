import { PayloadAction } from '@reduxjs/toolkit';
import { SerializedError, ThagaMetaData } from './types';

export function randomStr() {
  return (Math.random() + 1).toString(36).substring(7);
}

export function isThagaAction<Payload, Type extends string, E = never>(
  action: unknown,
): action is PayloadAction<Payload, Type, ThagaMetaData, E> {
  const meta = (action as { meta?: ThagaMetaData } | null | undefined)?.meta;
  return !!meta?.thaga;
}

/**
 * Convert a thrown value into a plain, serializable object suitable for storing
 * in a Redux action's payload. Modeled on RTK's `miniSerializeError`. Keeps
 * actions free of non-serializable Error instances while preserving the most
 * useful debugging info.
 */
export function serializeError(error: unknown): SerializedError {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: (error as { code?: string }).code,
    };
  }
  if (typeof error === 'object' && error !== null) {
    const obj = error as Record<string, unknown>;
    const out: SerializedError = {};
    for (const key of ['name', 'message', 'stack', 'code'] as const) {
      if (typeof obj[key] === 'string') out[key] = obj[key];
    }
    if (out.message || out.name) return out;
  }
  return { message: String(error) };
}
