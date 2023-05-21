import { Action, PayloadAction, createAction } from '@reduxjs/toolkit';
import {
  CancelledEffect,
  call,
  cancelled as cancelledEffect,
  put,
} from 'redux-saga/effects';

import { ThagaMetaData } from './types';
import { thagaConfig } from './config';

export function createThagaAction<
  Payload = void,
  ReturnPayload = void,
  Type extends string = string,
  ExtraArgs = any
>(
  type: Type,
  worker: (
    paylod: Payload,
    action: PayloadAction<Payload, Type, ThagaMetaData>,
    ...args: ExtraArgs[]
  ) => Generator<any, ReturnPayload, unknown>
) {
  const cancelled = createAction(
    `${type}/cancelled`,
    (initiatorAction: PayloadAction<Payload, Type, ThagaMetaData>) => ({
      payload: initiatorAction.payload,
      meta: {
        thaga: true,
        id: initiatorAction.meta.id,
        cancelled: true,
      } as ThagaMetaData,
    })
  );

  const failed = createAction(
    `${type}/failed`,
    (initiatorAction: PayloadAction<Payload, Type, ThagaMetaData>) => ({
      payload: initiatorAction.payload,
      meta: {
        thaga: true,
        id: initiatorAction.meta.id,
        failed: true,
      } as ThagaMetaData,
    })
  );

  const finished = createAction(
    `${type}/finished`,
    (
      result: ReturnPayload,
      initiatorAction: PayloadAction<Payload, Type, ThagaMetaData>
    ) => ({
      payload: result,
      meta: {
        thaga: true,
        id: initiatorAction.meta.id,
        finished: true,
      } as ThagaMetaData,
    })
  );

  function actionCreator(payload: Payload) {
    const action: PayloadAction<Payload, Type, ThagaMetaData> = {
      type: type,
      payload,
      meta: { thaga: true, id: thagaConfig.getId() },
    };
    return action;
  }

  actionCreator.cancelled = cancelled;
  actionCreator.failed = failed;
  actionCreator.finished = finished;

  actionCreator.type = type;
  actionCreator.toString = () => type;

  actionCreator.match = (action: Action<unknown>): action is PayloadAction =>
    action.type === type;

  actionCreator.worker = function* (
    initiatorAction: PayloadAction<Payload, Type, ThagaMetaData>,
    ...args: any[]
  ) {
    try {
      const result: ReturnPayload = yield call(
        worker,
        initiatorAction.payload,
        initiatorAction,
        ...args
      );
      yield put(finished(result, initiatorAction));
    } catch (error) {
      yield put(failed(initiatorAction));
      throw error;
    } finally {
      if ((yield cancelledEffect()) as CancelledEffect) {
        yield put(cancelled(initiatorAction));
      }
    }
  };

  return actionCreator;
}
