import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { MailerService } from '@nestjs-modules/mailer';
import { InternalServerErrorException } from '@nestjs/common';

@Processor('email')
export class EmailProcessor {
  constructor(private readonly mailerService: MailerService) {}

  @Process('sendEmail')
  async handleSendEmail(job: Job) {
    const { email, voucherCode } = job.data;
    console.log('Email job started at:', new Date().toISOString());

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

      console.log('Email sent at:', new Date().toISOString());
    } catch (error) {
      console.error('Error sending email:', error);
      throw new InternalServerErrorException('Failed to send voucher email');
    }
  }
}
