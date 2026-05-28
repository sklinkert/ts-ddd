import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { OutboxOrmEntity } from './outbox.orm-entity';
import { OutboxPublisher } from './outbox.publisher';

@Module({
  imports: [CqrsModule, MikroOrmModule.forFeature([OutboxOrmEntity])],
  providers: [OutboxPublisher],
  exports: [OutboxPublisher],
})
export class OutboxModule {}
