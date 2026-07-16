import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { EntityManager } from '@mikro-orm/postgresql';

/**
 * Kubernetes-style probes, served outside the /api/v1 prefix (see
 * configureApp). /healthz answers as long as the process is up;
 * /readyz additionally requires a live database connection.
 */
@ApiExcludeController()
@Controller()
export class HealthController {
  constructor(private readonly em: EntityManager) {}

  @Get('healthz')
  health(): { status: string } {
    return { status: 'ok' };
  }

  @Get('readyz')
  async ready(): Promise<{ status: string }> {
    try {
      await this.em.fork().getConnection().execute('select 1');
    } catch {
      throw new ServiceUnavailableException({ status: 'unavailable' });
    }
    return { status: 'ok' };
  }
}
