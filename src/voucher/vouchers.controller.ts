import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
  Get,
  Param,
} from '@nestjs/common';
import { VouchersService } from './vouchers.service';
import { RequestVoucherDto } from './dto/request-voucher.dto';
import { ApiTags } from '@nestjs/swagger';
import { ResponseMessage } from 'src/decorators/customize';

@ApiTags('vouchers')
@Controller('vouchers')
export class VouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  /**
   * Request a new voucher.
   * @param requestVoucherDto The data containing the necessary information to request a new voucher.
   * @returns The newly requested voucher.
   */
  @Post('request')
  async requestVoucher(@Body() requestVoucherDto: RequestVoucherDto) {
    const voucher =
      await this.vouchersService.requestVoucher(requestVoucherDto);
    return voucher;
  }

  /**
   * Retrieves a single voucher by its unique identifier.
   * @param voucherId The unique identifier of the voucher to retrieve.
   * @returns The requested voucher object if found, otherwise null.
   */
  @Get(':voucherId')
  @ResponseMessage('find voucher')
  async findOneById(@Param('voucherId') voucherId: string) {
    return this.vouchersService.findOneById(voucherId);
  }
}
