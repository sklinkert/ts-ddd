import 'reflect-metadata';
import { MikroORM } from '@mikro-orm/postgresql';
import config from '../mikro-orm.config';

/**
 * Programmatic migration runner so migrations work without @mikro-orm/cli —
 * in particular inside the production Docker image, which ships only
 * runtime dependencies. Usage: node dist/cli/migrate.js up|down
 */
async function main(): Promise<void> {
  const direction = process.argv[2];
  if (direction !== 'up' && direction !== 'down') {
    throw new Error(`usage: migrate.js up|down (got "${direction ?? ''}")`);
  }

  const orm = await MikroORM.init(config);
  try {
    const migrator = orm.getMigrator();
    const executed = direction === 'up' ? await migrator.up() : await migrator.down();
    for (const migration of executed) {
      process.stdout.write(`${direction}: ${migration.name}\n`);
    }
    if (executed.length === 0) {
      process.stdout.write('no pending migrations\n');
    }
  } finally {
    await orm.close(true);
  }
}

main().catch((err) => {
  console.error('migration failed', err);
  process.exitCode = 1;
});
