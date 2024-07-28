import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AdminGuard } from '../guards/admin.guard';
import { ResponseMessage } from '../decorators/customize';
import { IGetUserAuthInfoRequest } from '../type/user-auth-request.interface';

@ApiTags('events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ResponseMessage('Create new event')
  create(@Body() createEventDto: CreateEventDto) {
    return this.eventsService.create(createEventDto);
  }

  @Get(':eventId')
  @ResponseMessage('find event')
  async findOneById(@Param('eventId') eventId: string) {
    return this.eventsService.findOneById(eventId);
  }

  @ApiBearerAuth('JWT-auth') 
  @UseGuards(JwtAuthGuard)
  @Post(':eventId/editable/me')
  @ResponseMessage('Edit able event')
  async markEditable(
    @Param('eventId') eventId: string,
    @Req() request: IGetUserAuthInfoRequest,
  ): Promise<void> {
    const userId = request.user._id;
    return this.eventsService.markEditable(eventId, userId);
  }

  @ApiBearerAuth('JWT-auth')
  @Post(':eventId/editable/release')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Publish editable events')
  async releaseEditable(
    @Param('eventId') eventId: string,
    @Req() request: IGetUserAuthInfoRequest,
  ): Promise<void> {
    const userId = request.user._id.toString();
    await this.eventsService.releaseEditable(eventId, userId);
  }

  @Post(':eventId/editable/maintain')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('maintain Edit able')
  async maintainEditable(
    @Param('eventId') eventId: string,
    @Req() request: IGetUserAuthInfoRequest,
  ): Promise<void> {
    const userId = request.user._id.toString();
    return this.eventsService.maintainEditable(eventId, userId);
  }
}
