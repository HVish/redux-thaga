import { expect, test } from '@jest/globals';
import { createThagaAction } from './createThagaAction';
import { call, put } from 'redux-saga/effects';
import { Action } from '@reduxjs/toolkit';

const thagaName = 'thagaAction';

function* actionWorker(
  payload: void,
  action: Action,
  extraArgs1: string,
  extraArgs2: number
) {
  yield 1;
}

let thagaActionCreator = createThagaAction(thagaName, actionWorker);

function expectThagaActionCreator(actionCreator: any, ...args: any[]) {
  expect(typeof actionCreator).toBe('function');

  const action = actionCreator(...args);

  expect(actionCreator).toHaveProperty('match');
  expect(actionCreator.match(action)).toBe(true);

  expect(actionCreator).toHaveProperty('type');
  expect(actionCreator.type).toBe(action.type);
  expect(actionCreator.toString()).toBe(action.type);

  expect(action).toHaveProperty('meta');
  expect(action.meta).toEqual(
    expect.objectContaining({
      id: expect.any(String),
      thaga: true,
    })
  );
}

test('createThagaAction() should return an actionCreator', () => {
  expectThagaActionCreator(thagaActionCreator);
});

test('thaga should return a redux action', () => {
  const thagaAction = thagaActionCreator();
  expect(thagaAction).toEqual({
    type: thagaName,
    meta: { thaga: true, id: expect.any(String) },
  });
});

test('thaga should have saga worker', () => {
  expect(thagaActionCreator).toHaveProperty('worker');
});

test('thaga should have lifecyle action creators', () => {
  const thagaAction = thagaActionCreator();

  expect(thagaActionCreator).toHaveProperty('finished');
  expectThagaActionCreator(thagaActionCreator.finished, {}, thagaAction);

  expect(thagaActionCreator).toHaveProperty('cancelled');
  expectThagaActionCreator(thagaActionCreator.cancelled, thagaAction);

  expect(thagaActionCreator).toHaveProperty('failed');
  expectThagaActionCreator(thagaActionCreator.failed, thagaAction);
});

test('cancelled action should have correct flags in meta data', () => {
  const thagaAction = thagaActionCreator();
  const cancelledAction = thagaActionCreator.cancelled(thagaAction);
  expect(cancelledAction.meta).toEqual(
    expect.objectContaining({
      thaga: true,
      cancelled: true,
    })
  );
});

test('failed action should have correct flags in meta data', () => {
  const thagaAction = thagaActionCreator();
  const failedAction = thagaActionCreator.failed(thagaAction);
  expect(failedAction.meta).toEqual(
    expect.objectContaining({
      thaga: true,
      failed: true,
    })
  );
});

test('finished action should have correct flags in meta data', () => {
  const thagaAction = thagaActionCreator();
  const finishedAction = thagaActionCreator.finished(undefined, thagaAction);
  expect(finishedAction.meta).toEqual(
    expect.objectContaining({
      thaga: true,
      finished: true,
    })
  );
});

test('thaga-worker should dispatch finished action', () => {
  const extraArgs1 = 'extraArgs1';
  const extraArgs2 = 123;

  const thagaAction = thagaActionCreator();
  const saga = thagaActionCreator.worker(thagaAction, extraArgs1, extraArgs2);

  expect(saga.next().value).toEqual(
    call(actionWorker, undefined, thagaAction, extraArgs1, extraArgs2)
  );

  expect(saga.next().value).toEqual(
    put(thagaActionCreator.finished(undefined, thagaAction))
  );
});

test('thaga-worker should dispatch failed action and forward the error', () => {
  const extraArgs1 = 'extraArgs1';
  const extraArgs2 = 123;

  const thagaAction = thagaActionCreator();
  const saga = thagaActionCreator.worker(thagaAction, extraArgs1, extraArgs2);
  const error = new Error('test error');

  expect(saga.next().value).toEqual(
    call(actionWorker, undefined, thagaAction, extraArgs1, extraArgs2)
  );

  expect(saga.throw(error).value).toEqual(
    put(thagaActionCreator.failed(thagaAction))
  );

  saga.next();

  expect(() => saga.next()).toThrow(error);
});
