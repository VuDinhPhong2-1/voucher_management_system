import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber } from 'class-validator';
import mongoose from 'mongoose';

export class CreateVoucherDto {
  @IsNotEmpty({ message: 'Code không được để trống!' })
  @IsString({ message: 'Code phải là một chuỗi!' })
  @ApiProperty({ example: 'ABCD1234', description: 'Mã voucher' })
  code: string;

  @IsNotEmpty({ message: 'Event ID không được để trống!' })
  @IsNumber({}, { message: 'Event ID phải là một số!' })
  @ApiProperty({
    example: '123ac412415124124124',
    description: 'ID của sự kiện liên quan đến voucher',
  })
  eventId: mongoose.Schema.Types.ObjectId;

  @IsNotEmpty({ message: 'Issued vouchers không được để trống!' })
  @IsNumber({}, { message: 'Issued vouchers phải là một số!' })
  @ApiProperty({ example: 0, description: 'Số lượng voucher đã phát hành' })
  issuedVouchers: number;
}
