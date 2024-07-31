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
      startSession: jest.fn(),
    },
  };
  const mockSession = {
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    abortTransaction: jest.fn(),
    endSession: jest.fn(),
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

  describe('markEditable', () => {
    it('should mark an event as editable', async () => {
      const eventId = 'someEventId';
      const userId = new Types.ObjectId();

      const mockEvent = {
        _id: eventId,
        editingBy: null,
        save: jest.fn(),
      };
      //const session = await this.eventModel.db.startSession();
      mockEventModel.db.startSession.mockResolvedValue(mockSession);
      // const event = await this.eventModel.findById(eventId).session(session).exec();
      mockEventModel.findById.mockReturnValue({
        session: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockEvent),
      });

      await eventsService.markEditable(eventId, userId);

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

      await expect(eventsService.markEditable(eventId, userId)).rejects.toThrow(
        NotFoundException,
      );

      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
    });

    it('should throw ConflictException if event is being edited by another user', async () => {
      const eventId = 'someEventId';
      const userId = new Types.ObjectId();
      const otherUserId = new Types.ObjectId();

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

      await expect(eventsService.markEditable(eventId, userId)).rejects.toThrow(
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

      await expect(eventsService.markEditable(eventId, userId)).rejects.toThrow(
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

      // Call the service method with invalid IDs
      await expect(
        eventsService.releaseEditable(invalidEventId, userId),
      ).rejects.toThrow(BadRequestException);

      // Ensure no session operations are performed
      expect(mockSession.startTransaction).toHaveBeenCalled();
      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
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

    it('should handle and rethrow unexpected errors', async () => {
      const eventId = new Types.ObjectId().toString();
      const userId = new Types.ObjectId().toString();

      mockEventModel.db.startSession.mockResolvedValue(mockSession);
      mockEventModel.findById.mockReturnValue({
        session: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error('Unexpected error')),
      });

      await expect(
        eventsService.releaseEditable(eventId, userId),
      ).rejects.toThrow('Unexpected error');

      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
    });
  });

  describe('maintainEditable', () => {
    it('should update lastEditedAt if the event is being edited by the current user', async () => {
      const eventId = 'someEventId';
      const userId = new Types.ObjectId().toString();

      const mockEvent = {
        _id: eventId,
        editingBy: userId,
        lastEditedAt: new Date(Date.now() - 2 * 60 * 1000), // less than 5 minutes ago
        save: jest.fn(),
      };

      mockEventModel.db.startSession.mockResolvedValue(mockSession);
      mockEventModel.findById.mockReturnValue({
        session: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockEvent),
      });

      await eventsService.maintainEditable(eventId, userId);

      expect(mockSession.startTransaction).toHaveBeenCalled();
      expect(mockEventModel.findById).toHaveBeenCalledWith(eventId);
      expect(mockEvent.save).toHaveBeenCalledWith({ session: mockSession });
      expect(mockEvent.lastEditedAt).toBeInstanceOf(Date);
      expect(mockSession.commitTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
    });

    it('should reset editingBy if another user is editing and the edit has expired', async () => {
      const eventId = 'someEventId';
      const userId = new Types.ObjectId().toString();
      const expiredDate = new Date(Date.now() - 10 * 60 * 1000); // more than 5 minutes ago

      const mockEvent = {
        _id: eventId,
        editingBy: new Types.ObjectId().toString(),
        lastEditedAt: expiredDate,
        save: jest.fn(),
      };

      mockEventModel.db.startSession.mockResolvedValue(mockSession);
      mockEventModel.findById.mockReturnValue({
        session: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockEvent),
      });

      await eventsService.maintainEditable(eventId, userId);

      expect(mockSession.startTransaction).toHaveBeenCalled();
      expect(mockEventModel.findById).toHaveBeenCalledWith(eventId);
      expect(mockEvent.save).toHaveBeenCalledWith({ session: mockSession });
      expect(mockEvent.editingBy).toBeNull();
      expect(mockSession.commitTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
    });

    it('should throw ConflictException if another user is editing and the edit has not expired', async () => {
      const eventId = 'someEventId';
      const userId = new Types.ObjectId().toString();

      const mockEvent = {
        _id: eventId,
        editingBy: new Types.ObjectId().toString(),
        lastEditedAt: new Date(Date.now() - 2 * 60 * 1000), // less than 5 minutes ago
        save: jest.fn(),
      };

      mockEventModel.db.startSession.mockResolvedValue(mockSession);
      mockEventModel.findById.mockReturnValue({
        session: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockEvent),
      });

      await expect(
        eventsService.maintainEditable(eventId, userId),
      ).rejects.toThrow(ConflictException);

      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
    });

    it('should throw NotFoundException if the event is not found', async () => {
      const eventId = 'someEventId';
      const userId = new Types.ObjectId().toString();

      mockEventModel.db.startSession.mockResolvedValue(mockSession);
      mockEventModel.findById.mockReturnValue({
        session: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        eventsService.maintainEditable(eventId, userId),
      ).rejects.toThrow(NotFoundException);

      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
    });

    it('should handle and rethrow unexpected errors', async () => {
      const eventId = 'someEventId';
      const userId = new Types.ObjectId().toString();

      mockEventModel.db.startSession.mockResolvedValue(mockSession);
      mockEventModel.findById.mockReturnValue({
        session: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error('Unexpected error')),
      });

      await expect(
        eventsService.maintainEditable(eventId, userId),
      ).rejects.toThrow('Unexpected error');

      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
    });
  });
});
