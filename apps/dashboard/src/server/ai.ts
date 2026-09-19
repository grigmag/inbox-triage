import 'server-only';

import { createOpenRouter } from '@openrouter/ai-sdk-provider';

import { env } from './env';

const openrouter = createOpenRouter({
  apiKey: env.OPENROUTER_API_KEY,
  compatibility: 'strict',
});

export const aiModel = openrouter(env.OPENROUTER_MODEL);
