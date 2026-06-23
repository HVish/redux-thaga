import { expect, jest, test } from '@jest/globals';
import { createThagaMiddleware } from './createThagaMiddleware';
import { UnknownAction, MiddlewareAPI } from '@reduxjs/toolkit';
import { ThagaCancelledError, ThagaTimeoutError } from './types';
import { createThagaAction } from './createThagaAction';

test('should return a redux middleware', () => {
  const action: UnknownAction = { type: 'testAction' };
  const nextAction: UnknownAction = { type: 'nextAction' };

  const next = jest.fn().mockImplementation(() => nextAction);
  const api = {} as MiddlewareAPI;

  const thagaMiddleware = createThagaMiddleware();
  const result = thagaMiddleware(api)(next)(action);
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

  const dispatch = thagaMiddleware(api)(next);

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

  const dispatch = thagaMiddleware(api)(next);

  try {
    const promise = dispatch(initiatorAction);
    dispatch(thagaAction.failed(initiatorAction, new Error('boom')));
    await promise;
  } catch (error) {
    expect((error as { message?: string }).message).toBe('boom');
  }
});

test('should reject when cancelled action is dispatched', async () => {
  const thagaAction = createThagaAction(
    'testThaga',
    function* (_arg: { name: string }) {},
  );
  const thagaMiddleware = createThagaMiddleware();

  const next = jest.fn();
  const api = {} as MiddlewareAPI;
  const initiatorAction = thagaAction({ name: 'hello' });

  const dispatch = thagaMiddleware(api)(next);

  try {
    const promise = dispatch(initiatorAction);
    dispatch(thagaAction.cancelled(initiatorAction, 'user-aborted'));
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(ThagaCancelledError);
    expect((error as ThagaCancelledError).reason).toBe('user-aborted');
  }
});

test('promise.cancel() rejects with ThagaCancelledError and dispatches cancelled action', async () => {
  const thagaAction = createThagaAction('testThaga', function* () {});
  const thagaMiddleware = createThagaMiddleware();

  const dispatched: UnknownAction[] = [];
  const dispatch: (action: UnknownAction) => unknown = (action) => {
    dispatched.push(action);
    // route follow-up dispatches through the middleware so the cancellation
    // closes out the pending promise
    return chain(action);
  };
  const api = { dispatch, getState: () => ({}) } as MiddlewareAPI;
  const next = jest.fn();
  const chain = thagaMiddleware(api)(next) as (a: UnknownAction) => unknown;

  const initiatorAction = thagaAction();
  const promise = chain(initiatorAction) as ReturnType<typeof Promise.resolve>;

  (promise as unknown as { cancel: (r?: unknown) => void }).cancel('bye');

  try {
    await promise;
    throw new Error('expected rejection');
  } catch (error) {
    expect(error).toBeInstanceOf(ThagaCancelledError);
    expect((error as ThagaCancelledError).reason).toBe('bye');
  }

  const cancelledAction = dispatched.find(
    (a) => a.type === 'testThaga/cancelled',
  );
  expect(cancelledAction).toBeDefined();
});

test('failed action rejects the promise with the serialized error', async () => {
  const thagaAction = createThagaAction('testThaga', function* () {});
  const thagaMiddleware = createThagaMiddleware();

  const next = jest.fn();
  const api = {} as MiddlewareAPI;
  const dispatch = thagaMiddleware(api)(next);

  const initiatorAction = thagaAction();
  const promise = dispatch(initiatorAction);
  dispatch(thagaAction.failed(initiatorAction, new Error('kaboom')));

  await expect(promise).rejects.toMatchObject({
    name: 'Error',
    message: 'kaboom',
  });
});

test('middleware-level timeoutMs rejects with ThagaTimeoutError', async () => {
  jest.useFakeTimers();
  try {
    const thagaAction = createThagaAction('testThaga', function* () {});
    const thagaMiddleware = createThagaMiddleware({ timeoutMs: 50 });

    const next = jest.fn();
    const api = {} as MiddlewareAPI;
    const dispatch = thagaMiddleware(api)(next);

    const promise = dispatch(thagaAction());
    jest.advanceTimersByTime(50);

    await expect(promise).rejects.toBeInstanceOf(ThagaTimeoutError);
  } finally {
    jest.useRealTimers();
  }
});

test('per-action timeoutMs overrides the middleware default', async () => {
  jest.useFakeTimers();
  try {
    const thagaAction = createThagaAction('testThaga', function* () {}, {
      timeoutMs: 10,
    });
    const thagaMiddleware = createThagaMiddleware({ timeoutMs: 10000 });

    const next = jest.fn();
    const api = {} as MiddlewareAPI;
    const dispatch = thagaMiddleware(api)(next);

    const promise = dispatch(thagaAction());
    jest.advanceTimersByTime(10);

    await expect(promise).rejects.toBeInstanceOf(ThagaTimeoutError);
  } finally {
    jest.useRealTimers();
  }
});
