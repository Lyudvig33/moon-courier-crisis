import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Rover } from '../../entities/rover.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Rover])],
  exports: [TypeOrmModule],
})
export class RoverModule {}
