# redux-thaga integration test

A small React + Redux app used to manually exercise `@hvish/redux-thaga`
against its published npm release (success, failure, per-action timeout, and
in-flight cancellation). Built with [Vite](https://vite.dev/).

## Scripts

### `npm run dev`

Starts the Vite dev server at [http://localhost:3000](http://localhost:3000)
with hot module replacement.

### `npm run build`

Type-checks with `tsc --noEmit`, then builds the production bundle to `dist/`.

### `npm run preview`

Serves the production build locally for a final check.
