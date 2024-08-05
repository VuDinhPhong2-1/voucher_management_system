import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Event, EventDocument } from './schemas/event.schema';
import { CreateEventDto } from './dto/create-event.dto';
import { Model, MongooseError, Types } from 'mongoose';
import { isValidObjectId } from '../utils/utils';
import { EditLocksService } from '../editLock/editlocks.service';
@Injectable()
export class EventsService {
  constructor(
    @InjectModel(Event.name)
    private eventModel: Model<EventDocument>,
    private readonly editLocksService: EditLocksService,
  ) {}

  async create(createEventDto: CreateEventDto): Promise<Event> {
    try {
      const createdEvent = await this.eventModel.create(createEventDto);
      return createdEvent;
    } catch (error) {
      throw new InternalServerErrorException('Failed to create event');
    }
  }

  async findOneById(eventId: string): Promise<Event | null> {
    try {
      if (!isValidObjectId(eventId))
        throw new BadRequestException(`This eventId is invalid`);
      const event = await this.eventModel.findOne({ _id: eventId }).exec();
      if (!event)
        throw new NotFoundException(`event with eventId ${eventId} not found`);
      return event;
    } catch (error) {
      throw new Error(`Failed to find event: ${error.message}`);
    }
  }

  async markEditable(eventId: string, userId: Types.ObjectId) {
    try {
      const event = await this.eventModel.findById(eventId).exec();
      if (!event) throw new NotFoundException('Event not found');
      if (event.lastEditedAt) {
        const expiredEdit = new Date(
          event.lastEditedAt.getTime() + 5 * 60 * 1000,
        );
        const now = new Date();
        if (now < expiredEdit) {
          if (event.editingBy && !event.editingBy.equals(userId)) {
            throw new ConflictException(
              'Event is already being edited by another user or was edited within the last 5 minutes',
              `tryEditingBy ${userId.toString()}`,
            );
          }
        }
      }
      // -> is correct has expired editing or has a role editing

      let editLock = await this.editLocksService.findEditLockByUserId(eventId);
      if (editLock)
        await this.editLocksService.destroyEditLock(userId.toString());

      const createdLock = await this.editLocksService.createEditLock(
        userId.toString(),
        eventId,
      );
      if (!createdLock)
        throw new ConflictException(
          `Could not create new edit lock by ${userId.toString()}`,
        );
      event.editingBy = userId;
      event.lastEditedAt = new Date();
      const saveEvent = await event.save();
      return saveEvent;
    } catch (error) {
      throw error;
    }
  }

  async markEditable2(eventId: string, userId: Types.ObjectId) {
    const session = await this.eventModel.db.startSession();
    session.startTransaction();
    try {
      const event = await this.eventModel
        .findById(eventId)
        .session(session)
        .exec();
      if (!event) throw new NotFoundException('Event not found');
      if (event.lastEditedAt) {
        const expiredEdit = new Date(
          event.lastEditedAt.getTime() + 5 * 60 * 1000,
        );
        const now = new Date();
        if (now < expiredEdit) {
          if (event.editingBy && !event.editingBy.equals(userId)) {
            throw new ConflictException(
              'Event is already being edited by another user or was edited within the last 5 minutes',
              `tryEditingBy ${userId.toString()}`,
            );
          }
        }
      }
      event.editingBy = userId;
      event.lastEditedAt = new Date();
      const saveEvent = await event.save({ session });
      await session.commitTransaction();
      return saveEvent;
    } catch (error) {
      await session.abortTransaction();
      if (error instanceof MongooseError) {
        throw new Error(error.message);
      }
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async releaseEditable(eventId: string, userId: string): Promise<void> {
    if (!isValidObjectId(eventId) || !isValidObjectId(userId)) {
      throw new BadRequestException(`This voucherId/userId is invalid`);
    }

    const session = await this.eventModel.db.startSession();
    try {
      const event = await this.eventModel.findById(eventId).exec();
      if (!event) throw new NotFoundException('Event not found');

      if (!event.editingBy || event.editingBy.toString() !== userId) {
        throw new ConflictException(
          'You are not authorized to release this edit',
        );
      }

      session.startTransaction();
      event.editingBy = null;
      event.lastEditedAt = null;
      await event.save({ session });

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
  async maintainEditable(eventId: string, userId: string): Promise<void> {
    const session = await this.eventModel.db.startSession();
    session.startTransaction();

    try {
      const event = await this.eventModel
        .findById(eventId)
        .session(session)
        .exec();

      if (!event) throw new NotFoundException('Event not found');

      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const isUserEditing = event.editingBy?.toString() === userId;
      const isEditingExpired =
        event.lastEditedAt && event.lastEditedAt < fiveMinutesAgo;

      if (event.editingBy && !isUserEditing) {
        if (isEditingExpired) {
          event.editingBy = null;
          await event.save({ session });
        } else {
          throw new ConflictException(
            'Another user is currently editing this event',
          );
        }
      } else if (isUserEditing) {
        event.lastEditedAt = new Date();
        await event.save({ session });
      }

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
  async findExpiredEdits(fiveMinutesAgo: Date): Promise<Event[]> {
    try {
      const events = await this.eventModel
        .find({
          editingBy: { $exists: true, $ne: null },
          lastEditedAt: { $exists: true, $ne: null, $lt: fiveMinutesAgo },
        })
        .exec();
      return events;
    } catch (error) {
      throw new Error(`Failed to find expired edits: ${error.message}`);
    }
  }
  async clearEditingLastEditedAtFields(eventId: string): Promise<void> {
    const session = await this.eventModel.db.startSession();
    session.startTransaction();

    try {
      if (!isValidObjectId(eventId))
        throw new BadRequestException(`This eventId is invalid`);

      await this.eventModel.updateOne(
        { _id: eventId },
        { $set: { editingBy: null, lastEditedAt: null } },
        { session },
      );

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}
