import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { EventsService } from './events.service';

@Processor('events')
export class EventsProcessor {
  private readonly logger = new Logger(EventsProcessor.name);

  constructor(private readonly eventsService: EventsService) {}

  @Process('releaseExpiredEdits')
  async handleReleaseExpiredEdits(job: Job) {
    this.logger.debug(`Processing job ${job.id} to release expired edits`);
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    try {
      const events = await this.eventsService.findExpiredEdits(fiveMinutesAgo);
      this.logger.debug(`All events  expired ${events}`);

      for (const event of events) {
        await this.eventsService.clearEditingLastEditedAtFields(event._id.toString());
      }
    } catch (error) {
      this.logger.error(`Failed to release expired edits: ${error.message}`);
    }
  }
}
