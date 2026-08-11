import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateDeliveryDto, PreviewDeliveryDto } from './dto/delivery.dto';
import { DeliveryService } from './delivery.service';
import { GameService } from '../game/game.service';

@ApiTags('deliveries')
@Controller('deliveries')
export class DeliveryController {
  constructor(
    private readonly deliveryService: DeliveryService,
    private readonly gameService: GameService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List deliveries for the active game' })
  async findAll() {
    const session = await this.gameService.getActiveSession();
    return this.deliveryService.findAll(session.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get delivery by id' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.deliveryService.findOne(id);
  }

  @Post('preview')
  @ApiOperation({ summary: 'Preview a delivery without mutating state' })
  preview(@Body() dto: PreviewDeliveryDto) {
    return this.deliveryService.preview(dto.orderId, dto.roverId);
  }

  @Post()
  @ApiOperation({ summary: 'Start and simulate a delivery' })
  start(@Body() dto: CreateDeliveryDto) {
    return this.deliveryService.start(dto.orderId, dto.roverId);
  }
}
