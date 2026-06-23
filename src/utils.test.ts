import { expect, test } from '@jest/globals';
import { isThagaAction, serializeError } from './utils';
import { ThagaCancelledError, ThagaTimeoutError } from './types';

test('isThagaAction recognizes actions with meta.thaga', () => {
  expect(isThagaAction({ type: 'a', meta: { thaga: true, id: '1' } })).toBe(
    true,
  );
});

test('isThagaAction rejects non-thaga actions', () => {
  expect(isThagaAction({ type: 'a' })).toBe(false);
  expect(isThagaAction({ type: 'a', meta: {} })).toBe(false);
  expect(isThagaAction(null)).toBe(false);
  expect(isThagaAction(undefined)).toBe(false);
});

test('serializeError extracts fields from Error instances', () => {
  const err = new TypeError('nope');
  const out = serializeError(err);
  expect(out.name).toBe('TypeError');
  expect(out.message).toBe('nope');
  expect(out.stack).toBeDefined();
});

test('serializeError extracts string fields from error-shaped objects', () => {
  expect(serializeError({ name: 'X', message: 'm', code: 'E' })).toEqual({
    name: 'X',
    message: 'm',
    code: 'E',
  });
});

test('serializeError falls back to String() for primitives', () => {
  expect(serializeError('boom')).toEqual({ message: 'boom' });
  expect(serializeError(42)).toEqual({ message: '42' });
  expect(serializeError(null)).toEqual({ message: 'null' });
  expect(serializeError({})).toEqual({ message: '[object Object]' });
});

test('ThagaCancelledError message includes the reason when provided', () => {
  expect(new ThagaCancelledError().message).toMatch(/cancelled/);
  expect(new ThagaCancelledError('bye').message).toContain('bye');
});

test('ThagaTimeoutError exposes the timeout value', () => {
  const err = new ThagaTimeoutError(250);
  expect(err.timeoutMs).toBe(250);
  expect(err.message).toContain('250');
});
