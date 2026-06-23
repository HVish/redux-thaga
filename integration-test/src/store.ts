import { configureStore, Middleware } from '@reduxjs/toolkit';
import createSagaMiddleware from 'redux-saga';
import { createThagaMiddleware } from '@hvish/redux-thaga';

import { tasksWorker, tasksReducer } from './reducer';

const sagaMiddleware = createSagaMiddleware();
const thagaMiddleware = createThagaMiddleware();

export const store = configureStore({
  reducer: { tasks: tasksReducer },
  middleware: (getDefaultMiddleware) =>
    // redux-saga 1.x predates RTK 2's UnknownAction typing; cast until
    // upstream ships RTK 2-compatible types.
    getDefaultMiddleware().concat(
      sagaMiddleware as unknown as Middleware,
      thagaMiddleware,
    ),
});

sagaMiddleware.run(tasksWorker);
