import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Event, EventDocument } from './schemas/event.schema';
import { CreateEventDto } from './dto/create-event.dto';
import { Model, Types } from 'mongoose';
@Injectable()
export class EventsService {
  constructor(
    @InjectModel(Event.name)
    private eventModel: Model<EventDocument>,
  ) {}

  async create(createEventDto: CreateEventDto): Promise<Event> {
    try {
      const createdEvent = await this.eventModel.create(createEventDto);
      return createdEvent;
    } catch (error) {
      console.error('Error creating event:', error);
      throw new InternalServerErrorException('Failed to create event');
    }
  }

  async findOneById(eventId: string): Promise<Event | null> {
    try {
      const user = await this.eventModel.findOne({ _id: eventId }).exec();
      if (!user)
        throw new NotFoundException(`User with email ${eventId} not found`);
      return user;
    } catch (error) {
      console.error(`Failed to find user: ${error.message}`);
      throw new Error(`Failed to find user: ${error.message}`);
    }
  }

  async markEditable(eventId: string, userId: Types.ObjectId): Promise<void> {
    const session = await this.eventModel.db.startSession();
    session.startTransaction();

    try {
      const event = await this.eventModel
        .findById(eventId)
        .session(session)
        .exec();
      if (!event) throw new NotFoundException('Event not found');

      if (event.editingBy && !event.editingBy.equals(userId))
        throw new ConflictException(
          'Event is already being edited by another user',
        );

      event.editingBy = userId;
      event.lastEditedAt = new Date();
      await event.save({ session });

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async releaseEditable(eventId: string, userId: string): Promise<void> {
    const session = await this.eventModel.db.startSession();
    session.startTransaction();

    try {
      const event = await this.eventModel
        .findById(eventId)
        .session(session)
        .exec();
      if (!event) throw new NotFoundException('Event not found');

      if (!event.editingBy || event.editingBy.toString() !== userId)
        throw new ConflictException(
          'You are not authorized to release this edit',
        );

      event.editingBy = null;
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
}
