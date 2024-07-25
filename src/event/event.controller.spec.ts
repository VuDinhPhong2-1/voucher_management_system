import { Test, TestingModule } from '@nestjs/testing';
import { EventController } from './event.controller';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { AdminGuard } from 'src/guards/admin.guard';
import { ResponseMessage } from 'src/decorators/customize';
import { IGetUserAuthInfoRequest } from 'src/type/user-auth-request.interface';

describe('EventController', () => {
  let controller: EventController;
  let service: EventsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventController],
      providers: [
        {
          provide: EventsService,
          useValue: {
            create: jest.fn(),
            markEditable: jest.fn(),
            releaseEditable: jest.fn(),
            maintainEditable: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<EventController>(EventController);
    service = module.get<EventsService>(EventsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create an event', async () => {
      const dto: CreateEventDto = {
        name: 'Test Event',
        maxVouchers: 100,
        issuedVouchers: 0,
      };
      jest.spyOn(service, 'create').mockResolvedValue(dto as any);

      expect(await controller.create(dto)).toEqual(dto);
    });
  });

  describe('markEditable', () => {
    it('should mark an event as editable', async () => {
      const eventId = 'eventId';
      const request = {
        user: { _id: 'userId' },
      } as unknown as IGetUserAuthInfoRequest;
      jest.spyOn(service, 'markEditable').mockResolvedValue(undefined);

      await controller.markEditable(eventId, request);

      expect(service.markEditable).toHaveBeenCalledWith(eventId, 'userId');
    });

    it('should handle NotFoundException', async () => {
      const eventId = 'eventId';
      const request = {
        user: { _id: 'userId' },
      } as unknown as IGetUserAuthInfoRequest;
      jest
        .spyOn(service, 'markEditable')
        .mockRejectedValue(new NotFoundException());

      await expect(controller.markEditable(eventId, request)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // Add more tests for releaseEditable and maintainEditable as needed
});
