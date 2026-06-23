import { PayloadAction } from '@reduxjs/toolkit';
import { ThagaMetaData } from './types';

export function randomStr() {
  return (Math.random() + 1).toString(36).substring(7);
}

export function isThagaAction<Payload, Type extends string, E = any>(
  action: unknown,
): action is PayloadAction<Payload, Type, ThagaMetaData, E> {
  const meta = (action as { meta?: ThagaMetaData } | null | undefined)?.meta;
  return !!meta?.thaga;
}
