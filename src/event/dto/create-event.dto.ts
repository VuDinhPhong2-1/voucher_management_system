import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber } from 'class-validator';

export class CreateEventDto {
  @IsNotEmpty({ message: 'Name không được để trống!' })
  @IsString({ message: 'Name phải là một chuỗi!' })
  @ApiProperty({ example: 'ajanuw', description: 'Name' })
  name: string;

  @IsNotEmpty({ message: 'Max vouchers không được để trống!' })
  @IsNumber({}, { message: 'Max vouchers phải là một số!' })
  @ApiProperty({ example: 'ajanuw', description: 'maxVouchers' })
  maxVouchers: number;

  @IsNotEmpty({ message: 'Issued vouchers không được để trống!' })
  @IsNumber({}, { message: 'Issued vouchers phải là một số!' })
  @ApiProperty({ example: 'ajanuw', description: 'issuedVouchers' })
  issuedVouchers: number;
}
