import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { VouchersService } from './vouchers.service';
import { Voucher } from './schemas/voucher.schema';
import { Event } from '../event/schemas/event.schema';
import { Queue } from 'bull';
import { BullModule } from '@nestjs/bull';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { RequestVoucherDto } from './dto/request-voucher.dto';

describe('VouchersService', () => {
  let vouchersService: VouchersService;
  let emailQueue: Queue;
  const mockVoucherModel = function (data) {
    this.code = data.code;
    this.eventId = data.eventId;
    this.save = jest.fn().mockResolvedValue(data);
  };

  const mockEventModel = {
    findById: jest.fn(),
    db: {
      startSession: jest.fn(),
    },
  };

  const mockSession = {
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    abortTransaction: jest.fn(),
    endSession: jest.fn(),
  };

  const mockEmailQueue = {
    add: jest.fn(),
  };

  beforeEach(async () => {
    jest.useRealTimers();
    jest.setTimeout(60000);
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        BullModule.forRoot({}),
        BullModule.registerQueue({
          name: 'email',
        }),
      ],
      providers: [
        VouchersService,
        {
          provide: getModelToken(Voucher.name),
          useValue: mockVoucherModel,
        },
        {
          provide: getModelToken(Event.name),
          useValue: mockEventModel,
        },
        {
          provide: 'email',
          useValue: mockEmailQueue,
        },
      ],
    }).compile();

    vouchersService = module.get<VouchersService>(VouchersService);
    emailQueue = module.get<Queue>('email');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('requestVoucher', () => {
    it('should successfully request a voucher', async () => {
      console.log('Starting test: should successfully request a voucher');

      const mockEvent = {
        _id: 'eventId',
        issuedVouchers: 100,
        maxVouchers: 100,
        save: jest.fn().mockResolvedValue(true),
      };

      mockEventModel.db.startSession.mockResolvedValue(mockSession);
      mockEventModel.findById.mockReturnValue({
        session: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockEvent),
      });

      const requestVoucherDto = {
        eventId: 'eventId',
        userEmail: 'vudinhphong.261001@gmail.com',
      } as RequestVoucherDto;

      await vouchersService.requestVoucher(requestVoucherDto);

      expect(mockSession.startTransaction).toHaveBeenCalled();
      expect(mockEventModel.findById).toHaveBeenCalledWith(
        requestVoucherDto.eventId,
      );
      expect(mockEvent.issuedVouchers).toBe(99);
      expect(mockEvent.save).toHaveBeenCalledWith({ session: mockSession });
      expect(mockSession.commitTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
      const expectedEmailQueueData = {
        name: 'sendEmail',
        data: {
          email: 'vudinhphong.261001@gmail.com',
          voucherCode: 'ABC123',
        },
        opts: {
          delay: 5000,
          attempts: 3,
          backoff: 1000,
          timeout: 10000,
        },
      };
      await emailQueue.add(expectedEmailQueueData);
    }, 60000);

    it('should throw NotFoundException if event is not found', async () => {
      mockEventModel.db.startSession.mockResolvedValue(mockSession);
      mockEventModel.findById.mockReturnValue({
        session: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      });

      const requestVoucherDto = {
        eventId: 'invalidEventId',
        userEmail: 'user@example.com',
      } as RequestVoucherDto;

      await expect(
        vouchersService.requestVoucher(requestVoucherDto),
      ).rejects.toThrow(NotFoundException);
      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
    });

    it('should throw ConflictException if no vouchers are available', async () => {
      const mockEvent = {
        _id: 'eventId',
        issuedVouchers: 0,
        maxVouchers: 2,
        save: jest.fn(),
      };

      mockEventModel.db.startSession.mockResolvedValue(mockSession);
      mockEventModel.findById.mockReturnValue({
        session: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockEvent),
      });

      const requestVoucherDto = {
        eventId: 'eventId',
        userEmail: 'user@example.com',
      } as RequestVoucherDto;

      await expect(
        vouchersService.requestVoucher(requestVoucherDto),
      ).rejects.toThrow(ConflictException);
      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
    });

    it('should handle errors and abort transaction', async () => {
      mockEventModel.db.startSession.mockResolvedValue(mockSession);
      mockEventModel.findById.mockImplementation(() => {
        throw new Error('Database error');
      });

      const requestVoucherDto = {
        eventId: 'eventId',
        userEmail: 'user@example.com',
      } as RequestVoucherDto;

      await expect(
        vouchersService.requestVoucher(requestVoucherDto),
      ).rejects.toThrow('Database error');
      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
    });
  });
});
