import { AnyAction, PayloadAction } from '@reduxjs/toolkit';
import { ThagaMetaData } from './types';

export function randomStr() {
  return (Math.random() + 1).toString(36).substring(7);
}

export function isThagaAction<Payload, Type extends string, E = any>(
  action: AnyAction
): action is PayloadAction<Payload, Type, ThagaMetaData, E> {
  if (action.meta?.thaga) return true;
  return false;
}
