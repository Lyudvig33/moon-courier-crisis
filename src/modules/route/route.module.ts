import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Route } from '../../entities/route.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Route])],
  exports: [TypeOrmModule],
})
export class RouteModule {}
