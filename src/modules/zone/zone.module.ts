import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Zone } from '../../entities/zone.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Zone])],
  exports: [TypeOrmModule],
})
export class ZoneModule {}
