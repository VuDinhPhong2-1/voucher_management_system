import { Types } from 'mongoose';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { Test, TestingModule } from '@nestjs/testing';
import { CreateEventDto } from './dto/create-event.dto';

describe('EventsController', () => {
  let eventsService: EventsService;
  let eventsController: EventsController;

  const mockEventsService = {
    create: jest.fn(),
    
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ ],
      controllers: [EventsController],
      providers: [
        {
          provide: EventsService,
          useValue: mockEventsService,
        },
      ],
    }).compile();

    eventsService = module.get<EventsService>(EventsService);
    eventsController = module.get<EventsController>(EventsController);
  });

  it('should be defined', () => {
    expect(eventsController).toBeDefined();
  });

  describe('create', ()=>{
    it('Should create a new event', async () => {
      const newEvent = {
        _id: new Types.ObjectId('61c0ccf11d7bf83d153d7c06'),
        name: 'Test Event',
        maxVouchers: 100,
        issuedVouchers: 100,
        editingBy: null,
        lastEditedAt: new Date(Date.now() - 5 * 60 * 1000),
      };
      const { _id, ...createEvent } = newEvent;
      mockEventsService.create = jest.fn().mockResolvedValueOnce(newEvent);
    
      const result = await eventsController.create(createEvent as CreateEventDto);
    
      expect(eventsService.create).toHaveBeenCalled();
    
      expect(result).toEqual(newEvent);
    });
    
  })
});
