import { Action, PayloadAction, createAction } from '@reduxjs/toolkit';
import {
  CancelledEffect,
  call,
  cancelled as cancelledEffect,
  put,
} from 'redux-saga/effects';

import type { ThagaInitiatorAction, ThagaMetaData } from './types';
import { thagaConfig } from './config';
import { serializeError } from './utils';

export interface CreateThagaActionOptions {
  /**
   * Per-action timeout in milliseconds. If set, the middleware rejects the
   * dispatched Promise with `ThagaTimeoutError` if no terminal action arrives
   * within this window. Overrides the middleware-level `timeoutMs` default.
   */
  timeoutMs?: number;
}

export function createThagaAction<
  Payload = void,
  ReturnPayload = void,
  Type extends string = string,
  ExtraArgs extends readonly unknown[] = [],
>(
  type: Type,
  worker: (
    paylod: Payload,
    action: PayloadAction<Payload, Type, ThagaMetaData>,
    ...args: ExtraArgs
  ) => Generator<unknown, ReturnPayload, unknown>,
  options: CreateThagaActionOptions = {},
) {
  const cancelled = createAction(
    `${type}/cancelled`,
    (
      initiatorAction: PayloadAction<Payload, Type, ThagaMetaData>,
      reason?: unknown,
    ) => ({
      payload: reason,
      meta: {
        thaga: true,
        id: initiatorAction.meta.id,
        cancelled: true,
      },
    }),
  );

  const failed = createAction(
    `${type}/failed`,
    (
      initiatorAction: PayloadAction<Payload, Type, ThagaMetaData>,
      error: unknown,
    ) => ({
      payload: serializeError(error),
      meta: {
        thaga: true,
        id: initiatorAction.meta.id,
        failed: true,
      },
    }),
  );

  const finished = createAction(
    `${type}/finished`,
    (
      result: ReturnPayload,
      initiatorAction: PayloadAction<Payload, Type, ThagaMetaData>,
    ) => ({
      payload: result,
      meta: {
        thaga: true,
        id: initiatorAction.meta.id,
        finished: true,
      },
    }),
  );

  function actionCreator(
    payload: Payload,
  ): ThagaInitiatorAction<Payload, ReturnPayload, Type> {
    const meta: ThagaMetaData = { thaga: true, id: thagaConfig.getId() };
    if (options.timeoutMs !== undefined) meta.timeoutMs = options.timeoutMs;
    const action: PayloadAction<Payload, Type, ThagaMetaData> = {
      type: type,
      payload,
      meta,
    };
    return action;
  }

  actionCreator.cancelled = cancelled;
  actionCreator.failed = failed;
  actionCreator.finished = finished;

  actionCreator.type = type;
  actionCreator.toString = () => type;

  actionCreator.match = (action: Action): action is PayloadAction =>
    action.type === type;

  actionCreator.worker = function* (
    initiatorAction: PayloadAction<Payload, Type, ThagaMetaData>,
    ...args: ExtraArgs
  ) {
    try {
      const result = (yield call(
        worker,
        initiatorAction.payload,
        initiatorAction,
        ...args,
      )) as ReturnPayload;
      yield put(finished(result, initiatorAction));
    } catch (error) {
      yield put(failed(initiatorAction, error));
      throw error;
    } finally {
      if ((yield cancelledEffect()) as CancelledEffect) {
        yield put(cancelled(initiatorAction));
      }
    }
  };

  return actionCreator;
}
