import { Request } from 'express';
import { IUser } from '../users/users.interface';

export interface IGetUserAuthInfoRequest extends Request {
  user: IUser;
}
