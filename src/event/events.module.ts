import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Event, EventSchema } from './schemas/event.schema';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { EditLocksModule } from 'src/editLock/editlocks.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Event.name, schema: EventSchema }]),
    EditLocksModule,
  ],
  controllers: [EventsController],
  providers: [EditLocksModule, EventsService],
  exports: [
    EventsService,
    MongooseModule.forFeature([{ name: Event.name, schema: EventSchema }]),
  ],
})
export class EventsModule {}
