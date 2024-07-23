// vouchers.service.ts
import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Voucher, VoucherDocument } from './schemas/voucher.schema';
import { MailerService } from '@nestjs-modules/mailer';
import { RequestVoucherDto } from './dto/request-voucher.dto';
import { EventDocument } from 'src/event/schemas/event.schema';
import { Model } from 'mongoose';

@Injectable()
export class VouchersService {
  constructor(
    @InjectModel(Voucher.name)
    private voucherModel: Model<VoucherDocument>,
    private readonly mailerService: MailerService,
    @InjectModel(Event.name)
    private eventModel: Model<EventDocument>,
  ) {}

  async requestVoucher(requestVoucherDto: RequestVoucherDto): Promise<Voucher> {
    const session = await this.eventModel.db.startSession();
    session.startTransaction();

    try {
      const event = await this.eventModel
        .findById(requestVoucherDto.eventId)
        .session(session)
        .exec();

      if (!event) 
        throw new Error('Event not found');


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
      await this.sendVoucherEmail(requestVoucherDto.userEmail, voucher.code);

      return voucher;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  private generateVoucherCode(): string {
    return Math.random().toString(36).substring(2, 15).toUpperCase();
  }

  private async sendVoucherEmail(
    email: string,
    voucherCode: string,
  ): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to: email,
        from: 'vudinhphong@gmail.com',
        subject: 'Your Voucher Code',
        html: `
          <html>
            <head>
              <meta charset='UTF-8' />
              <title>Voucher</title>
            </head>
            <body>
              <h1>Chúc mừng!</h1>
              <p>Chúng tôi rất vui khi thông báo rằng bạn đã nhận được một voucher.</p>
              <p><strong>Chi tiết Voucher:</strong></p>
              <ul>
                <li><strong>Mã Voucher:</strong> ${voucherCode}</li>
              </ul>
              <p>Xin cảm ơn bạn đã tham gia!</p>
              <footer>
                <p>Đội ngũ hỗ trợ khách hàng</p>
              </footer>
            </body>
          </html>
        `,
      });
    } catch (error) {
      console.error('Error sending email:', error);
      throw new InternalServerErrorException('Failed to send voucher email');
    }
  }
  
}
