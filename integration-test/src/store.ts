import { configureStore } from '@reduxjs/toolkit';
import createSagaMiddleware from 'redux-saga';
import { createThagaMiddleware } from '@hvish/redux-thaga';

import { tasksWorker, tasksReducer } from './reducer';

const sagaMiddleware = createSagaMiddleware();
const thagaMiddleware = createThagaMiddleware();

export const store = configureStore({
  reducer: { tasks: tasksReducer },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(sagaMiddleware, thagaMiddleware),
});

sagaMiddleware.run(tasksWorker);
