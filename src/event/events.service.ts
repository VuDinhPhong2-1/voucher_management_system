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
import { Model, Types } from 'mongoose';
import { isValidObjectId } from '../utils/utils';
@Injectable()
export class EventsService {
  constructor(
    @InjectModel(Event.name)
    private eventModel: Model<EventDocument>,
  ) {}

  /**
   * Creates a new event using the provided `CreateEventDto`.
   * @param createEventDto - The data transfer object containing the details of the new event to be created.
   * @returns A Promise that resolves with the newly created event.
   * @throws InternalServerErrorException if there is an error while creating the event.
   */
  async create(createEventDto: CreateEventDto): Promise<Event> {
    try {
      const createdEvent = await this.eventModel.create(createEventDto);
      return createdEvent;
    } catch (error) {
      throw new InternalServerErrorException('Failed to create event');
    }
  }
  /**
   * Finds an event by its unique identifier.
   * @param eventId - The unique identifier of the event to be found.
   * @returns A Promise that resolves with the found event or null if not found.
   * @throws BadRequestException if the provided eventId is invalid.
   * @throws NotFoundException if the event with the given eventId is not found.
   */
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
  /**
   * Marks the specified event as editable by the provided user.
   * @param eventId - The unique identifier of the event to be edited.
   * @param userId - The unique identifier of the user who wants to edit the event.
   * @returns A Promise that resolves when the event is successfully marked as editable.
   * @throws NotFoundException if the event with the given eventId is not found.
   * @throws ConflictException if the event is already being edited by another user.
   */
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

  /**
   * Releases the specified event from being edited by the provided user.
   * @param eventId - The unique identifier of the event to be released from editing.
   * @param userId - The unique identifier of the user who wants to release the event from editing.
   * @returns A Promise that resolves when the event is successfully released from editing.
   * @throws BadRequestException if the provided eventId or userId is invalid.
   * @throws NotFoundException if the event with the given eventId is not found.
   * @throws ConflictException if the user is not authorized to release the edit.
   */
  async releaseEditable(eventId: string, userId: string): Promise<void> {
    const session = await this.eventModel.db.startSession();
    session.startTransaction();

    try {
      if (!isValidObjectId(eventId) || !isValidObjectId(userId))
        throw new BadRequestException(`This voucherId/userId is invalid`);
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
  /**
   * Maintains the editing status of the specified event.
   * This function checks if the user is currently editing the event and if the editing session has expired.
   * If the user is editing the event and the editing session has not expired, it updates the last edited timestamp.
   * If another user is currently editing the event, it throws a ConflictException.
   * If the user is not editing the event and the editing session has expired, it releases the user from editing the event.
   * @param eventId - The unique identifier of the event to be maintained.
   * @param userId - The unique identifier of the user who wants to maintain the editing status of the event.
   * @returns A Promise that resolves when the editing status of the event is successfully maintained.
   * @throws BadRequestException if the provided eventId or userId is invalid.
   * @throws NotFoundException if the event with the given eventId is not found.
   * @throws ConflictException if the user is not authorized to maintain the edit.
   */
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
