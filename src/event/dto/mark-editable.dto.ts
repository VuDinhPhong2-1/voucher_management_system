import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId } from 'class-validator';
import mongoose from 'mongoose';

export class MarkEditableDto {
  @IsMongoId()
  @ApiProperty({ example: 'ajanuw', description: 'UserId' })
  userId: mongoose.Schema.Types.ObjectId;
}
