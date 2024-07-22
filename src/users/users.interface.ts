import { Types } from 'mongoose';
import { Role } from 'src/constants/enums/role.enum';

export interface IUser {
  _id: Types.ObjectId;
  name: string;
  email: string;
  refresh_token: string;
  role: Role;
  age: number;
}

