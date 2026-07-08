import './augmentation';
import {
  configureStore,
  type Dispatch,
  type UnknownAction,
} from '@reduxjs/toolkit';
import type { ThunkDispatch } from 'redux-thunk';
import { test } from '@jest/globals';

import { createThagaAction } from './createThagaAction';
import { createThagaMiddleware } from './createThagaMiddleware';
import type { ThagaInitiatorAction, ThagaPromise } from './types';

// Compile-time type assertion helpers. These are not runtime checks — if the
// type relationship breaks, `tsc --noEmit` (run via `npm run typecheck` and in
// CI) fails. The `_*` prefix keeps the unused-vars rule satisfied for what
// are otherwise type-only assertions.
type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
type Expect<T extends true> = T;

const _thagaActionCreator = createThagaAction<{ id: string }, number, 'fetch'>(
  'fetch',
  function* (_payload, _action) {
    yield;
    return 42;
  },
);

// 1. The action creator returns a branded `ThagaInitiatorAction`, threading
//    `ReturnPayload` through the phantom carrier.
type _ActionShape = ReturnType<typeof _thagaActionCreator>;
type _expectAction = Expect<
  Equals<_ActionShape, ThagaInitiatorAction<{ id: string }, number, 'fetch'>>
>;

// 2. A plain `Dispatch` (after augmentation) resolves a thaga action to
//    `ThagaPromise<ReturnPayload>`.
declare const _plainDispatch: Dispatch<UnknownAction>;
type _expectPlainDispatchThaga = Expect<
  Equals<
    ReturnType<typeof _plainDispatch<{ id: string }, number, 'fetch'>>,
    ThagaPromise<number>
  >
>;

// 3. RTK's default middleware stack (thunk + thaga) yields a dispatch that
//    still resolves thaga actions to `ThagaPromise<ReturnPayload>`. This is
//    the case the augmentation of `ThunkDispatch` exists to cover.
const _store = configureStore({
  reducer: () => ({}),
  middleware: (getDefault) => getDefault().concat(createThagaMiddleware()),
});
declare const _storeDispatch: typeof _store.dispatch;
type _expectStoreDispatchThaga = Expect<
  Equals<
    ReturnType<typeof _storeDispatch<{ id: string }, number, 'fetch'>>,
    ThagaPromise<number>
  >
>;

// 4. Plain (non-thaga) actions on the store still type-check and return the
//    action itself (Dispatch's default overload).
declare const _plainAction: { type: 'plain'; payload: string };
type _expectPlainDispatched = Expect<
  Equals<
    ReturnType<typeof _storeDispatch<typeof _plainAction>>,
    typeof _plainAction
  >
>;

// 5. `ThunkDispatch` directly (without intersection) also picks the thaga
//    overload — needed because `useDispatch<AppDispatch>()` can resolve to it.
declare const _thunkDispatch: ThunkDispatch<unknown, undefined, UnknownAction>;
type _expectThunkDispatchThaga = Expect<
  Equals<
    ReturnType<typeof _thunkDispatch<{ id: string }, number, 'fetch'>>,
    ThagaPromise<number>
  >
>;

test('dispatch type augmentation is wired up (compile-time only)', () => {
  // The real assertions live in the `Expect<>` types above; this test exists
  // so Jest counts the file alongside the rest of the suite.
});
