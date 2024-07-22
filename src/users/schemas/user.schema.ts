import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { Role } from 'src/constants/enums/role.enum';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ type: mongoose.Schema.Types.ObjectId, auto: true })
  _id: mongoose.Schema.Types.ObjectId;

  @Prop()
  name: string;

  @Prop({
    required: true,
    unique: true,
  })
  email: string;

  @Prop({ required: true })
  password?: string;

  @Prop()
  age: number;

  @Prop()
  refresh_token: string;

  @Prop({
    type: String,
    enum: Role,
    default: Role.User,
  })
  role: Role;
}

export const UserSchema = SchemaFactory.createForClass(User);
