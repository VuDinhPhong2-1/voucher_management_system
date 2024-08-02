import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Voucher, VoucherDocument } from './schemas/voucher.schema';
import { RequestVoucherDto } from './dto/request-voucher.dto';
import { EventDocument } from '../event/schemas/event.schema';
import { Model } from 'mongoose';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { isValidObjectId } from '../utils/utils';

@Injectable()
export class VouchersService {
  constructor(
    @InjectModel(Voucher.name)
    private voucherModel: Model<VoucherDocument>,
    @InjectModel(Event.name)
    private eventModel: Model<EventDocument>,
    @InjectQueue('email') private emailQueue: Queue,
  ) {}

  /**
   * This function is responsible for requesting a voucher for an event.
   * It starts a transaction, checks if the event exists and if it has available vouchers.
   * If the event has available vouchers, it decrements the count of issued vouchers, creates a new voucher, and commits the transaction.
   * It then sends an email to the user with the voucher code.
   * If any errors occur during the process, the transaction is aborted and the error is thrown.
   * @param requestVoucherDto - A DTO containing the ID of the event for which the voucher is requested and the email of the user who will receive the voucher.
   * @returns A promise that resolves to an object with a message indicating that the voucher request has been received and an email will be sent shortly.
   */
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

      if (!event) throw new NotFoundException('Event not found');

      if (event.issuedVouchers <= 0)
        throw new ConflictException('No vouchers available');

      event.issuedVouchers -= 1;
      await event.save({ session });

      const voucher = new this.voucherModel({
        code: this.generateVoucherCode(),
        eventId: event._id,
      });

      console.log('Voucher created at:', new Date().toISOString());

      const resultSendEmail = await this.emailQueue.add(
        'sendEmail',
        {
          email: requestVoucherDto.userEmail,
          voucherCode: voucher.code,
        },
        {
          delay: 5000,
          attempts: 3,
          backoff: 1000,
          timeout: 10000,
        },
      );

      try {
        await resultSendEmail.finished();
        await voucher.save({ session });
        await session.commitTransaction();
        session.endSession();
        return {
          message:
            'Voucher request has been received and email will be sent soon.',
        };
      } catch (emailError) {
        await session.abortTransaction();
        session.endSession();
        throw new InternalServerErrorException(
          'Failed to send email, transaction aborted',
        );
      }
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  /**
   * Generates a unique voucher code by creating a random string of 12 alphanumeric characters.
   * @returns A string representing the generated voucher code.
   */
  private generateVoucherCode(): string {
    return Math.random().toString(36).substring(2, 15).toUpperCase();
  }

  /**
   * Finds a voucher by its ID.
   *
   * @param voucherId - The ID of the voucher to be found.
   * @returns The voucher object if found, otherwise throws a NotFoundException.
   * @throws BadRequestException if the provided voucherId is invalid.
   * @throws Error if there's an error while finding the voucher.
   */
  async findOneById(voucherId: string) {
    try {
      if (!isValidObjectId(voucherId))
        throw new BadRequestException(`This voucherId is invalid`);
      const voucher = await this.voucherModel
        .findOne({ _id: voucherId })
        .exec();
      if (!voucher)
        throw new NotFoundException(
          `voucher with voucherId ${voucherId} not found`,
        );
      return voucher;
    } catch (error) {
      throw new Error(`Failed to find voucher: ${error.message}`);
    }
  }
}
