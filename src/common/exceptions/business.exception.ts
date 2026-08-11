import { HttpException, HttpStatus } from '@nestjs/common';
import { BusinessErrorCode } from '../enums/game.enums';

export class BusinessException extends HttpException {
  constructor(
    public readonly code: BusinessErrorCode,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    public readonly details?: Record<string, unknown>,
  ) {
    super({ statusCode: status, code, message, details }, status);
  }
}
