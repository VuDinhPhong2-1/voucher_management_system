import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';

export type EventDocument = Event & Document;

@Schema({ timestamps: true })
export class Event {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  maxVouchers: number;

  @Prop({ required: true })
  issuedVouchers: number;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null })
  editingBy: Types.ObjectId;

  @Prop({ default: null })
  lastEditedAt: Date;
}

export const EventSchema = SchemaFactory.createForClass(Event);
