export default {
  '*.{js,jsx,mjs,cjs,ts,tsx}': [
    'prettier --write',
    'eslint --fix --max-warnings=0',
  ],
  '*.{json,jsonc,md,mdx,css,scss,yml,yaml}': 'prettier --write',
};
