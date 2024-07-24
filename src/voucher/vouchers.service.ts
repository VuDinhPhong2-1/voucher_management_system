import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Voucher, VoucherDocument } from './schemas/voucher.schema';
import { RequestVoucherDto } from './dto/request-voucher.dto';
import { EventDocument } from 'src/event/schemas/event.schema';
import { Model } from 'mongoose';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class VouchersService {
  constructor(
    @InjectModel(Voucher.name)
    private voucherModel: Model<VoucherDocument>,
    @InjectModel(Event.name)
    private eventModel: Model<EventDocument>,
    @InjectQueue('email') private emailQueue: Queue,
  ) {}

  async requestVoucher(
    requestVoucherDto: RequestVoucherDto,
  ): Promise<{ message: string }> {
    const session = await this.eventModel.db.startSession();
    session.startTransaction();

    try {
      const event = await this.eventModel
        .findById(requestVoucherDto.eventId)
        .session(session)
        .exec();

      if (!event) throw new Error('Event not found');

      if (event.issuedVouchers <= 0)
        throw new ConflictException('No vouchers available');

      event.issuedVouchers -= 1;
      await event.save({ session });

      const voucher = new this.voucherModel({
        code: this.generateVoucherCode(),
        eventId: event._id,
      });

      await voucher.save({ session });

      await session.commitTransaction();
      session.endSession();

      console.log('Voucher created at:', new Date().toISOString());

      // Đưa email vào hàng đợi với cấu hình thời gian
      await this.emailQueue.add(
        'sendEmail',
        {
          email: requestVoucherDto.userEmail,
          voucherCode: voucher.code,
        },
        {
          delay: 5000, // Thời gian trễ 5 giây trước khi thực hiện công việc
          attempts: 3, // Số lần thử lại tối đa
          backoff: 1000, // Thời gian chờ giữa các lần thử lại
          timeout: 10000, // Thời gian chờ tối đa cho công việc là 10 giây
        },
      );

      return {
        message: 'Voucher request received and email will be sent shortly.',
      };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  private generateVoucherCode(): string {
    return Math.random().toString(36).substring(2, 15).toUpperCase();
  }
}
