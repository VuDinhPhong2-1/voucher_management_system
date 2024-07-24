import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { VouchersService } from './vouchers.service';
import { RequestVoucherDto } from './dto/request-voucher.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('vouchers')
@Controller('vouchers')
export class VouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  @Post('request')
  async requestVoucher(@Body() requestVoucherDto: RequestVoucherDto) {
    const voucher =
      await this.vouchersService.requestVoucher(requestVoucherDto);
    return voucher;
  }
}
