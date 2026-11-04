import { loadEnvConfig } from '@next/env';
import { generateText } from 'ai';

import {
  BILLING_GUARD,
  allowsBillableRequests,
} from './openrouter-billing-guard';

const TIMEOUT_MS = 30_000;

async function runSmokeTest() {
  loadEnvConfig(process.cwd(), process.env.NODE_ENV !== 'production');

  const { aiModel } = await import('../src/server/ai');

  console.log('Making one billable OpenRouter text-generation request.');

  const result = await generateText({
    model: aiModel,
    prompt:
      'Write one short sentence welcoming a photographer to Inbox Triage.',
    maxRetries: 0,
    timeout: TIMEOUT_MS,
    telemetry: { isEnabled: false },
  });

  console.log('\nGenerated text:\n');
  console.log(result.text);
  console.log('\nUsage:\n');
  console.log(JSON.stringify(result.usage, null, 2));
}

async function main() {
  if (!allowsBillableRequests(process.env[BILLING_GUARD])) {
    console.error(
      `Refusing to make a billable request. Set ${BILLING_GUARD}=true to confirm this smoke test.`,
    );
    process.exitCode = 1;
    return;
  }

  try {
    await runSmokeTest();
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('is missing or empty')
    ) {
      console.error(error.message);
    } else {
      const errorName = error instanceof Error ? error.name : 'UnknownError';
      console.error(
        `OpenRouter smoke test failed (${errorName}). Check the configured key, model, network, and OpenRouter account.`,
      );
    }

    process.exitCode = 1;
  }
}

void main();
