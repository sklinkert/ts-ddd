import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { OutboxOrmEntity } from './outbox.orm-entity';
import { OutboxPublisher } from './outbox.publisher';
import {
  IntegrationEventDispatcher,
  LoggingIntegrationEventDispatcher,
} from './integration-event-dispatcher';

@Module({
  imports: [MikroOrmModule.forFeature([OutboxOrmEntity])],
  providers: [
    OutboxPublisher,
    { provide: IntegrationEventDispatcher, useClass: LoggingIntegrationEventDispatcher },
  ],
  exports: [OutboxPublisher, IntegrationEventDispatcher],
})
export class OutboxModule {}
