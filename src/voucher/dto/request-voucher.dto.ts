import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RequestVoucherDto {
  @ApiProperty({
    description: 'ID của sự kiện để yêu cầu voucher',
    example: '605c72efc4d4d1f4d0e4c9b1',
  })
  @IsNotEmpty()
  @IsString()
  eventId: string;

  @ApiProperty({
    description: 'Email của người dùng để nhận voucher',
    example: 'user@example.com',
  })
  @IsNotEmpty()
  @IsString()
  userEmail: string;
}
