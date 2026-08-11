import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDeliveryDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  orderId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  roverId: string;
}

export class PreviewDeliveryDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  orderId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  roverId: string;
}
