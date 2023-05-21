import { randomStr } from './utils';

let getIdFn = randomStr;

export const thagaConfig = {
  get getId() {
    return getIdFn;
  },
  setIdFn(fn: () => string) {
    getIdFn = fn;
  },
};
