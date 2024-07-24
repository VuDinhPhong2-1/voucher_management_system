import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Voucher, VoucherSchema } from './schemas/voucher.schema';
import { VouchersController } from './vouchers.controller';
import { VouchersService } from './vouchers.service';
import { EventsModule } from 'src/event/events.module';
import { BullModule } from '@nestjs/bull';
import { EmailProcessor } from './email.processor';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Voucher.name, schema: VoucherSchema }]),
    BullModule.registerQueue({
      name: 'email',
    }),
    EventsModule,
  ],
  controllers: [VouchersController],
  providers: [VouchersService, EmailProcessor],
  exports: [VouchersService],
})
export class VoucherModule {}
