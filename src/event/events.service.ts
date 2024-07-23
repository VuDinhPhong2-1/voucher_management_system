import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Event, EventDocument } from './schemas/event.schema';
import { CreateEventDto } from './dto/create-event.dto';
import { Model } from 'mongoose';

@Injectable()
export class EventsService {
  constructor(
    @InjectModel(Event.name)
    private eventModel: Model<EventDocument>,
  ) {}

  async create(createEventDto: CreateEventDto): Promise<Event> {
    try {
      const createdEvent = new this.eventModel(createEventDto);
      return createdEvent.save();
    } catch (error) {
      console.error('Error creating event:', error);
      throw new InternalServerErrorException('Failed to create event');
    }
  }
  async findOneById(eventId: string) {
    return this.eventModel.findById(eventId);
  }
  // async findOneById(
  //   eventId: string,
  //   session?: ClientSession,
  // ): Promise<EventDocument> {
  //   try {
  //     const query = this.eventModel.findById(eventId);
  //     if (session) {
  //       query.session(session);
  //     }
  //     const event = await query.exec();
  //     if (!event) {
  //       throw new NotFoundException(`Event with ID ${eventId} not found`);
  //     }
  //     return event;
  //   } catch (error) {
  //     console.error(`Error finding event with ID ${eventId}:`, error);
  //     if (error instanceof NotFoundException) {
  //       throw error;
  //     }
  //     throw new InternalServerErrorException('Failed to find event');
  //   }
  // }
}
