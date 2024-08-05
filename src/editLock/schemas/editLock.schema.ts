import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, Types } from 'mongoose';

export type EditLockDocument = HydratedDocument<EditLock>;

@Schema({ timestamps: true })
export class EditLock {
  @Prop({ type: mongoose.Schema.Types.ObjectId, auto: true })
  _id: Types.ObjectId;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    unique: true,
  })
  eventId: Types.ObjectId;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    unique: true,
  })
  userId: Types.ObjectId;
}

export const EditLockSchema = SchemaFactory.createForClass(EditLock);
