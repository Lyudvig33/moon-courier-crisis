import { Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { GameService } from './game.service';

@ApiTags('game')
@Controller('game')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Get()
  @ApiOperation({ summary: 'Get active game session summary' })
  getGame() {
    return this.gameService.getGameSummary();
  }

  @Post()
  @ApiOperation({ summary: 'Create a new game session (Play Again)' })
  createGame() {
    return this.gameService.createNewGame();
  }

  @Get('map')
  @ApiOperation({ summary: 'Get lunar map zones and routes' })
  getMap() {
    return this.gameService.getMap();
  }

  @Get('orders')
  @ApiOperation({ summary: 'List orders for the active session' })
  getOrders() {
    return this.gameService.getOrders();
  }

  @Get('rovers')
  @ApiOperation({ summary: 'List rovers for the active session' })
  getRovers() {
    return this.gameService.getRovers();
  }

  @Get('events')
  @ApiOperation({ summary: 'List game events for the active session' })
  getEvents() {
    return this.gameService.getEvents();
  }

  @Post('next-day')
  @ApiOperation({ summary: 'Advance to the next lunar day' })
  nextDay() {
    return this.gameService.nextDay();
  }
}
