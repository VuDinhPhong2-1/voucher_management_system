import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type VoucherDocument = HydratedDocument<Voucher>;

@Schema({ timestamps: true })
export class Voucher {
  @Prop({ required: true, unique: true })
  code: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true })
  eventId: mongoose.Schema.Types.ObjectId;

  @Prop({ type: Date, default: Date.now })
  issuedAt: Date;
}

export const VoucherSchema = SchemaFactory.createForClass(Voucher);
