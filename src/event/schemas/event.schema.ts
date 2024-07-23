import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

export type EventDocument = Event & Document;

@Schema({ timestamps: true })
export class Event {

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  maxVouchers: number;

  @Prop({ required: true })
  issuedVouchers: number;
}

export const EventSchema = SchemaFactory.createForClass(Event);
