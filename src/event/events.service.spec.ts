import { Test, TestingModule } from '@nestjs/testing';
import { EventsService } from './events.service';
import { getModelToken } from '@nestjs/mongoose';
import { Event } from './schemas/event.schema';
import { Model, Document, Types } from 'mongoose';
import {
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { EditLocksService } from '../editLock/editlocks.service';
import { EditLock } from '../editLock/schemas/editLock.schema';

describe('EventsService', () => {
  let eventsService: EventsService;
  let mockEventModel: any;
  let mockSession: any;
  let mockEditLockModel: any;
  let editLockModel: Model<EditLock>;
  const mockEvent = {
    _id: new Types.ObjectId('61c0ccf11d7bf83d153d7c06'),
    name: 'Test Event',
    maxVouchers: 100,
    issuedVouchers: 100,
    editingBy: new Types.ObjectId('61c0ccf11d7bf83d153d7c08'),
    lastEditedAt: new Date(Date.now() - 5 * 60 * 1000),
    save: jest.fn(),
  } as any;

  beforeEach(async () => {
    mockEventModel = {
      findById: jest.fn(),
      create: jest.fn(),
      db: {
        startSession: jest.fn(),
      },
    };
    mockEditLockModel = {
      create: jest.fn(),
      findOne: jest.fn(),
      deleteOne: jest.fn(),
    };
    mockSession = {
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      abortTransaction: jest.fn(),
      endSession: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        EditLocksService,
        {
          provide: getModelToken(Event.name),
          useValue: mockEventModel,
        },
        {
          provide: getModelToken(EditLock.name),
          useValue: mockEditLockModel,
        },
      ],
    }).compile();

    eventsService = module.get<EventsService>(EventsService);
    editLockModel = module.get<Model<EditLock>>(getModelToken(EditLock.name));
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
      mockEventModel.create.mockRejectedValueOnce(
        new Error('Failed to create'),
      );

      await expect(eventsService.create(mockEvent)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('markEditable2', () => {
    it('should mark an event as editable', async () => {
      const eventId = 'someEventId';
      const userId = new Types.ObjectId();

      const mockEvent = {
        _id: eventId,
        editingBy: null,
        lastEditedAt: null,
        save: jest.fn(),
      };

      mockEventModel.db.startSession.mockResolvedValue(mockSession);
      mockEventModel.findById.mockReturnValue({
        session: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockEvent),
      });

      await eventsService.markEditable2(eventId, userId);

      expect(mockSession.startTransaction).toHaveBeenCalled();
      expect(mockEventModel.findById).toHaveBeenCalledWith(eventId);
      expect(mockEvent.save).toHaveBeenCalledWith({ session: mockSession });
      expect(mockEvent.editingBy).toEqual(userId);
      expect(mockSession.commitTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
    });

    it('should throw NotFoundException if event is not found', async () => {
      const eventId = 'someEventId';
      const userId = new Types.ObjectId();

      mockEventModel.db.startSession.mockResolvedValue(mockSession);
      mockEventModel.findById.mockReturnValue({
        session: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(eventsService.markEditable2(eventId, userId)).rejects.toThrow(
        NotFoundException,
      );

      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
    });

    it('should throw ConflictException if event is being edited by another user or was edited within the last 5 minutes', async () => {
      const eventId = 'someEventId';
      const userId = new Types.ObjectId();
      const otherUserId = new Types.ObjectId();

      const mockEvent = {
        _id: eventId,
        editingBy: otherUserId,
        lastEditedAt: new Date(Date.now()),
        save: jest.fn(),
      };

      mockEventModel.db.startSession.mockResolvedValue(mockSession);
      mockEventModel.findById.mockReturnValue({
        session: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockEvent),
      });

      await expect(eventsService.markEditable2(eventId, userId)).rejects.toThrow(
        ConflictException,
      );

      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
    });

    it('should handle and rethrow unexpected errors', async () => {
      const eventId = 'someEventId';
      const userId = new Types.ObjectId();

      mockEventModel.db.startSession.mockResolvedValue(mockSession);
      mockEventModel.findById.mockReturnValue({
        session: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error('Unexpected error')),
      });

      await expect(eventsService.markEditable2(eventId, userId)).rejects.toThrow(
        'Unexpected error',
      );

      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
    });
  });

  describe('releaseEditable', () => {
    it('should throw BadRequestException for invalid IDs', async () => {
      const invalidEventId = 'invalidEventId';
      const userId = new Types.ObjectId().toString();

      await expect(
        eventsService.releaseEditable(invalidEventId, userId),
      ).rejects.toThrow(BadRequestException);

      expect(mockEventModel.db.startSession).not.toHaveBeenCalled();
      expect(mockSession.startTransaction).not.toHaveBeenCalled();
      expect(mockSession.abortTransaction).not.toHaveBeenCalled();
      expect(mockSession.endSession).not.toHaveBeenCalled();
    });

    it('should successfully release an editable event', async () => {
      const eventId = new Types.ObjectId().toString();
      const userId = new Types.ObjectId().toString();

      const mockEvent = {
        _id: eventId,
        editingBy: userId,
        save: jest.fn(),
      };

      mockEventModel.db.startSession.mockResolvedValue(mockSession);
      mockEventModel.findById.mockReturnValue({
        session: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockEvent),
      });

      await eventsService.releaseEditable(eventId, userId);

      expect(mockSession.startTransaction).toHaveBeenCalled();
      expect(mockEventModel.findById).toHaveBeenCalledWith(eventId);
      expect(mockEvent.save).toHaveBeenCalledWith({ session: mockSession });
      expect(mockEvent.editingBy).toBeNull();
      expect(mockSession.commitTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
    });

    it('should throw NotFoundException if event is not found', async () => {
      const eventId = new Types.ObjectId().toString();
      const userId = new Types.ObjectId().toString();

      mockEventModel.db.startSession.mockResolvedValue(mockSession);
      mockEventModel.findById.mockReturnValue({
        session: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        eventsService.releaseEditable(eventId, userId),
      ).rejects.toThrow(NotFoundException);

      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
    });

    it('should throw ConflictException if user is not authorized to release edit', async () => {
      const eventId = new Types.ObjectId().toString();
      const userId = new Types.ObjectId().toString();
      const otherUserId = new Types.ObjectId().toString();

      const mockEvent = {
        _id: eventId,
        editingBy: otherUserId,
        save: jest.fn(),
      };

      mockEventModel.db.startSession.mockResolvedValue(mockSession);
      mockEventModel.findById.mockReturnValue({
        session: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockEvent),
      });

      await expect(
        eventsService.releaseEditable(eventId, userId),
      ).rejects.toThrow(ConflictException);

      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
    });
  });
});
