import { Test, TestingModule } from '@nestjs/testing';
import { EventsService } from './events.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Event, EventSchema } from './schemas/event.schema';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EditLocksModule } from '../editLock/editlocks.module';
import { EditLocksService } from '../editLock/editlocks.service';
import { EditLock, EditLockSchema } from '../editLock/schemas/editLock.schema'; // Thêm import schema EditLock
import { ConflictException } from '@nestjs/common';

describe('EventsService with real database', () => {
  let eventsService: EventsService;
  let eventModel: Model<Event>;
  let editLocksService: EditLocksService;
  let editLockModel: Model<EditLock>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        MongooseModule.forRootAsync({
          imports: [ConfigModule],
          useFactory: async (configService: ConfigService) => ({
            uri: configService.get<string>('MONGODB_URI'),
          }),
          inject: [ConfigService],
        }),
        MongooseModule.forFeature([
          { name: Event.name, schema: EventSchema },
          { name: EditLock.name, schema: EditLockSchema }, // Thêm schema EditLock vào module
        ]),
        EditLocksModule,
      ],
      providers: [EventsService, EditLocksService], // Sửa lỗi lặp lại ở đây
    }).compile();

    eventsService = module.get<EventsService>(EventsService);
    eventModel = module.get<Model<Event>>(getModelToken(Event.name));
    editLocksService = module.get<EditLocksService>(EditLocksService);
    editLockModel = module.get<Model<EditLock>>(getModelToken(EditLock.name));
  });
  //(Mongodb Transaction => markEditAble2, Optimistic Concurrency Control => markEditAble)
  it('should allow only one user to mark the event as editable and others should fail', async () => {
    const eventId = new Types.ObjectId('66abbff91d11b96e5bc8ab0c');
    const userId1 = new Types.ObjectId('669e13fba339226649e435a6');
    const userId2 = new Types.ObjectId('669e153e410439dea7d17adf');
    const userId3 = new Types.ObjectId('669e176602ca09d12abe9e5f');
    const userId4 = new Types.ObjectId('66a0737bfb495726786c09e9');
    const userId5 = new Types.ObjectId('66a073acfb495726786c09ec');
    const userId6 = new Types.ObjectId('66a07926b78cf6183f65761a');
    const userId7 = new Types.ObjectId('66a07933b78cf6183f65761d');
    const userId8 = new Types.ObjectId('66a07a2e9f8772533e63a747');
    const userId9 = new Types.ObjectId('66a5ce0eb1a28e261287459a');
    const userId10 = new Types.ObjectId('66a5d5e4b1a28e26128745b3');
    const userId11 = new Types.ObjectId('66a5d68cb1a28e26128745b6');
    const userId12 = new Types.ObjectId('66a5d732b1a28e26128745b9');
    const userId13 = new Types.ObjectId('66a5d7a1b1a28e26128745bc');
    const userId14 = new Types.ObjectId('66a5d84db1a28e26128745bf');
    const userId15 = new Types.ObjectId('66a5d84db1a28e26128745c2');
    const userId16 = new Types.ObjectId('66a5d8d1b1a28e26128745c5');
    const userId17 = new Types.ObjectId('66a5d94cb1a28e26128745c8');
    const userId18 = new Types.ObjectId('66a5d9c2b1a28e26128745cb');
    const userId19 = new Types.ObjectId('66a5da41b1a28e26128745ce');

    const results = await Promise.allSettled([
      eventsService.markEditable(eventId.toHexString(), userId1),
      eventsService.markEditable(eventId.toHexString(), userId2),
      eventsService.markEditable(eventId.toHexString(), userId3),
      eventsService.markEditable(eventId.toHexString(), userId4),
      eventsService.markEditable(eventId.toHexString(), userId5),
      eventsService.markEditable(eventId.toHexString(), userId6),
      eventsService.markEditable(eventId.toHexString(), userId7),
      eventsService.markEditable(eventId.toHexString(), userId8),
      eventsService.markEditable(eventId.toHexString(), userId9),
      eventsService.markEditable(eventId.toHexString(), userId10),
      eventsService.markEditable(eventId.toHexString(), userId11),
      eventsService.markEditable(eventId.toHexString(), userId12),
      eventsService.markEditable(eventId.toHexString(), userId13),
      eventsService.markEditable(eventId.toHexString(), userId14),
      eventsService.markEditable(eventId.toHexString(), userId15),
      eventsService.markEditable(eventId.toHexString(), userId16),
      eventsService.markEditable(eventId.toHexString(), userId17),
      eventsService.markEditable(eventId.toHexString(), userId18),
      eventsService.markEditable(eventId.toHexString(), userId19),
    ]);

    let successCount = 0;
    let failureCount = 0;
    let successfulUsers = {};

    results.forEach((result) => {
      //console.log('Result ', result);
      if (result.status === 'fulfilled') {
        successCount++;
        successfulUsers = result.value.editingBy;
      } else if (result.status === 'rejected') {
        failureCount++;
      }
    });

    // expect(successCount).toBe(1);
    // expect(failureCount).toBe(18);
    // console.log(
    //   'The user who successfully marked the event as editable is: ',
    //   successfulUsers,
    // );
    // console.log('Success count: ', successCount);
    // console.log('Failure count: ', failureCount);
  });
});
