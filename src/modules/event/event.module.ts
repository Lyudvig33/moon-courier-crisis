import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameEvent } from '../../entities/game-event.entity';

@Module({
  imports: [TypeOrmModule.forFeature([GameEvent])],
  exports: [TypeOrmModule],
})
export class EventModule {}
