import { Action, Dispatch, Middleware } from '@reduxjs/toolkit';
import { thagaConfig } from './config';
import { isThagaAction } from './utils';

interface CreateThagaMiddlewareOptions {
  /** unique id generator function, used to generate a correlation id for each action */
  getId?: () => string;
}

export function createThagaMiddleware<DispatchExt, S, D extends Dispatch>({
  getId,
}: CreateThagaMiddlewareOptions = {}): Middleware<DispatchExt, S, D> {
  const promiseCallbackMap = new Map<
    string,
    { resolve: (payload: any) => void; reject: (error: any) => void }
  >();

  if (getId) {
    thagaConfig.setIdFn(getId);
  }

  return (api) => (next) => (action: Action) => {
    const result = next(action);

    if (!isThagaAction(action)) return result;

    const { id, cancelled, failed, finished } = action.meta;

    if (cancelled || failed || finished) {
      if (!promiseCallbackMap.has(id)) return result;

      const { resolve, reject } = promiseCallbackMap.get(id)!;

      if (finished) {
        resolve(action.payload);
      } else if (cancelled) {
        reject(action.payload);
      } else {
        reject(action.error);
      }

      promiseCallbackMap.delete(id);

      return result;
    }

    return new Promise((resolve, reject) => {
      promiseCallbackMap.set(id, { reject, resolve });
    });
  };
}
