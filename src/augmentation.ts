import type { Action, UnknownAction } from '@reduxjs/toolkit';
import type { ThagaInitiatorAction, ThagaPromise } from './types';

/**
 * Augment Redux's `Dispatch` with a thaga overload. When a thaga initiator
 * action is dispatched, the returned value is a `ThagaPromise` whose value
 * type is the worker's `ReturnPayload`. This mirrors the pattern redux-thunk
 * uses to type-augment `dispatch`.
 *
 * The overload is matched whenever the dispatched action satisfies
 * `ThagaInitiatorAction`. Plain actions continue to resolve to Redux's
 * default `(action: T) => T` overload.
 */
declare module 'redux' {
  interface Dispatch<A extends Action = UnknownAction> {
    <Payload, ReturnPayload, Type extends string>(
      action: ThagaInitiatorAction<Payload, ReturnPayload, Type>,
    ): ThagaPromise<ReturnPayload>;
  }
}

/**
 * `configureStore` includes redux-thunk by default, whose `ThunkDispatch`
 * exposes a catch-all `<A extends BasicAction>(action: A) => A` overload that
 * would otherwise outcompete the thaga overload on `Dispatch`. Augment
 * `ThunkDispatch` so the thaga overload is tried first when a thaga initiator
 * action is dispatched.
 */
declare module 'redux-thunk' {
  interface ThunkDispatch<State, ExtraThunkArg, BasicAction extends Action> {
    <Payload, ReturnPayload, Type extends string>(
      action: ThagaInitiatorAction<Payload, ReturnPayload, Type>,
    ): ThagaPromise<ReturnPayload>;
  }
}
