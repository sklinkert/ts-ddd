import { Module, MiddlewareConsumer, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import mikroOrmConfig from './mikro-orm.config';
import { SellerModule } from './modules/seller/seller.module';
import { ProductModule } from './modules/product/product.module';
import { OutboxModule } from './shared/infrastructure/outbox/outbox.module';
import { IdempotencyModule } from './shared/infrastructure/idempotency/idempotency.module';
import { IdempotencyMiddleware } from './shared/interface/middleware/idempotency.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    MikroOrmModule.forRoot(mikroOrmConfig),
    OutboxModule,
    IdempotencyModule,
    SellerModule,
    ProductModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(IdempotencyMiddleware).forRoutes(
      { path: '*', method: RequestMethod.POST },
      { path: '*', method: RequestMethod.PUT },
      { path: '*', method: RequestMethod.PATCH },
    );
  }
}
