import { ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { EditLock, EditLockDocument } from './schemas/editLock.schema';
import { Model, MongooseError } from 'mongoose';

@Injectable()
export class EditLocksService {
  constructor(
    @InjectModel(EditLock.name)
    private editLockModel: Model<EditLockDocument>,
  ) {}

  async createEditLock(userId: string, eventId: string): Promise<EditLock> {
    try {
      const [editLock] = await this.editLockModel.create([{ userId, eventId }]);

      return editLock;
    } catch (error) {
      if (error instanceof MongooseError) {
        throw new Error(`Failed to create edit lock: ${error.message}`);
      }
      throw new Error(`Failed to create edit lock: ${error.message}`);
    }
  }

  async findEditLockByUserId(eventId: string): Promise<EditLock> {
    try {
      return this.editLockModel.findOne({ eventId }).exec();
    } catch (error) {
      throw new Error(`Failed to find edit lock: ${error.message}`);
    }
  }
  async destroyEditLock(userId: string): Promise<void> {
    try {
      await this.editLockModel.deleteMany({ userId });
    } catch (error) {
      throw new Error(`Failed to destroy edit locks: ${error.message}`);
    }
  }
}
