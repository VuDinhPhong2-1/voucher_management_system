import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule, InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Event, EventSchema } from './schemas/event.schema';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { EventsProcessor } from './events.processor';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Event.name, schema: EventSchema }]),
    BullModule.registerQueue({
      name: 'events',
    }),
  ],
  controllers: [EventsController],
  providers: [EventsService, EventsProcessor],
  exports: [
    EventsService,
    MongooseModule.forFeature([{ name: Event.name, schema: EventSchema }]),
  ],
})
export class EventsModule {
  constructor(
    @InjectQueue('events') private readonly bullQueue: Queue,
  ) {
    this.bullQueue.add(
      'releaseExpiredEdits',
      {},
      { repeat: { every: 60000 } }, // Run every minute
    );
  }
}
