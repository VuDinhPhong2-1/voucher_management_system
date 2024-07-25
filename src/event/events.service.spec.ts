import { Test, TestingModule } from '@nestjs/testing';
import { EventsService } from './events.service';
import { getModelToken } from '@nestjs/mongoose';
import { Event } from './schemas/event.schema';
import { Model, Document, Types } from 'mongoose';
import {
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';

describe('EventsService', () => {
  const mockEvent = {
    _id: new Types.ObjectId('61c0ccf11d7bf83d153d7c06'),
    name: 'Test Event',
    maxVouchers: 100,
    issuedVouchers: 100,
    editingBy: new Types.ObjectId('61c0ccf11d7bf83d153d7c08'),
    lastEditedAt: new Date(Date.now() - 5 * 60 * 1000),
    save: jest.fn(),
  } as any;

  const mockEventModel = {
    findById: jest.fn(),
    create: jest.fn(),
    db: {
      startSession: jest.fn().mockResolvedValue({
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        abortTransaction: jest.fn(),
        endSession: jest.fn(),
      }),
    },
  };

  let eventsService: EventsService;
  let model: Model<Event & Document>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        {
          provide: getModelToken(Event.name),
          useValue: mockEventModel,
        },
      ],
    }).compile();

    eventsService = module.get<EventsService>(EventsService);
    model = module.get<Model<Event & Document>>(getModelToken(Event.name));
  });

  describe('create', () => {
    it('should create and return an event', async () => {
      const newEvent = {
        name: '80%',
        maxVouchers: 100,
        issuedVouchers: 100,
      };

      mockEventModel.create.mockResolvedValue(mockEvent);
      const result = await eventsService.create(newEvent);

      expect(result).toEqual(mockEvent);
      expect(mockEventModel.create).toHaveBeenCalledWith(newEvent);
    });

    it('should throw an error if create fails', async () => {
      (mockEventModel.create as jest.Mock).mockRejectedValueOnce(
        new Error('Failed to create'),
      );

      await expect(eventsService.create(mockEvent)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('maintainEditable', () => {});
});
