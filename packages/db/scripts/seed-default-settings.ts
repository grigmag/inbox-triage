import { createDbWithClient } from '../src/client';
import { loadDatabaseUrl } from '../src/cli/load-database-url';
import type { DefaultSettingsSeedSummary } from '../src/seeds/default-settings.seed';
import { seedDefaultSettings } from '../src/seeds/default-settings.seed';

function countResults(
  summary: DefaultSettingsSeedSummary,
  key: keyof DefaultSettingsSeedSummary['crew'],
): number {
  return Object.values(summary).reduce(
    (total, catalog) => total + catalog[key].length,
    0,
  );
}

async function main() {
  let client: ReturnType<typeof createDbWithClient>['client'] | undefined;

  try {
    const connection = createDbWithClient(loadDatabaseUrl());
    client = connection.client;
    const summary = await seedDefaultSettings(connection.db);

    console.log(
      `Settings defaults: ${countResults(summary, 'inserted')} inserted, ${countResults(summary, 'preserved')} preserved, ${countResults(summary, 'skipped')} skipped.`,
    );

    for (const [catalog, result] of Object.entries(summary)) {
      for (const name of result.skipped) {
        console.warn(
          `Skipped ${catalog} default "${name}": another row already uses that name.`,
        );
      }
    }
  } catch {
    console.error(
      'Could not seed settings defaults. Verify DATABASE_URL, apply migrations, and try again.',
    );
    process.exitCode = 1;
  } finally {
    if (client) {
      try {
        await client.end();
      } catch {
        console.error('Could not close the database connection cleanly.');
        process.exitCode = 1;
      }
    }
  }
}

await main();
