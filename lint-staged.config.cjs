/** @type {import('lint-staged').Config} */
module.exports = {
  "*.{ts,tsx,js,jsx,mjs,cjs}": "pnpm format:fix",
};
