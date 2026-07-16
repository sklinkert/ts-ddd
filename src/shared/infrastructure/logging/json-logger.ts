import { LoggerService } from '@nestjs/common';

type Level = 'info' | 'error' | 'warn' | 'debug' | 'verbose';

/**
 * Minimal structured logger: one JSON object per line on stdout/stderr,
 * mirroring what log collectors expect. Enabled via LOG_FORMAT=json.
 * If you need redaction, sampling, or transports, swap in nestjs-pino.
 */
export class JsonLogger implements LoggerService {
  log(message: unknown, context?: string): void {
    this.write('info', message, context);
  }

  error(message: unknown, stackOrContext?: string, context?: string): void {
    const stack = context !== undefined ? stackOrContext : undefined;
    const ctx = context !== undefined ? context : stackOrContext;
    this.write('error', message, ctx, stack);
  }

  warn(message: unknown, context?: string): void {
    this.write('warn', message, context);
  }

  debug(message: unknown, context?: string): void {
    this.write('debug', message, context);
  }

  verbose(message: unknown, context?: string): void {
    this.write('verbose', message, context);
  }

  private write(level: Level, message: unknown, context?: string, stack?: string): void {
    const entry: Record<string, unknown> = {
      level,
      time: new Date().toISOString(),
      ...(context ? { context } : {}),
      ...(typeof message === 'object' && message !== null
        ? { msg: message }
        : { msg: String(message) }),
      ...(stack ? { stack } : {}),
    };
    const line = JSON.stringify(entry);
    if (level === 'error') {
      process.stderr.write(line + '\n');
    } else {
      process.stdout.write(line + '\n');
    }
  }
}
