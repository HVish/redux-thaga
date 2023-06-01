import { expect, jest, test } from '@jest/globals';
import { createThagaMiddleware } from './createThagaMiddleware';
import { AnyAction, Dispatch, MiddlewareAPI } from '@reduxjs/toolkit';
import { createThagaAction } from './createThagaAction';

test('should return a redux middleware', () => {
  const action: AnyAction = { type: 'testAction' };
  const nextAction: AnyAction = { type: 'nextAction' };

  const next = jest.fn().mockImplementation(() => nextAction);
  const api = {} as MiddlewareAPI;

  const thagaMiddleware = createThagaMiddleware();
  const result = thagaMiddleware(api)(next as Dispatch<AnyAction>)(action);
  expect(next).toHaveBeenNthCalledWith(1, action);
  expect(result).toBe(nextAction);
});

test('should resolve when finished action is dispatched', async () => {
  const successPayload = 100;

  const thagaAction = createThagaAction('testThaga', function* () {
    return successPayload;
  });

  const thagaMiddleware = createThagaMiddleware();

  const next = jest.fn();
  const api = {} as MiddlewareAPI;
  const initiatorAction = thagaAction();

  const dispatch = thagaMiddleware(api)(next as Dispatch<AnyAction>);

  const promise = dispatch(initiatorAction);
  dispatch(thagaAction.finished(successPayload, initiatorAction));

  const result = await promise;
  expect(result).toBe(successPayload);
});

test('should reject when failed action is dispatched', async () => {
  const thagaAction = createThagaAction('testThaga', function* () {});
  const thagaMiddleware = createThagaMiddleware();

  const next = jest.fn();
  const api = {} as MiddlewareAPI;
  const initiatorAction = thagaAction();

  const dispatch = thagaMiddleware(api)(next as Dispatch<AnyAction>);

  try {
    const promise = dispatch(initiatorAction);
    dispatch(thagaAction.failed(initiatorAction));
    await promise;
  } catch (error) {
    expect(error).toBeUndefined();
  }
});

test('should reject when cancelled action is dispatched', async () => {
  const thagaAction = createThagaAction(
    'testThaga',
    function* (arg: { name: string }) {}
  );
  const thagaMiddleware = createThagaMiddleware();

  const next = jest.fn();
  const api = {} as MiddlewareAPI;
  const initiatorAction = thagaAction({ name: 'hello' });

  const dispatch = thagaMiddleware(api)(next as Dispatch<AnyAction>);

  try {
    const promise = dispatch(initiatorAction);
    dispatch(thagaAction.cancelled(initiatorAction));
    await promise;
  } catch (error) {
    expect(error).toEqual({ name: 'hello' });
  }
});
