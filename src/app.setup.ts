import { INestApplication, RequestMethod, ValidationPipe } from '@nestjs/common';
import { DomainExceptionFilter } from './shared/interface/filters/domain-exception.filter';

/**
 * Shared app configuration used by main.ts and the integration-test
 * bootstrap, so prefix/pipe/filter behavior can never drift between them.
 */
export function configureApp(app: INestApplication): INestApplication {
  app.setGlobalPrefix('api/v1', {
    exclude: [
      { path: 'healthz', method: RequestMethod.GET },
      { path: 'readyz', method: RequestMethod.GET },
    ],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );
  app.useGlobalFilters(new DomainExceptionFilter());
  return app;
}
