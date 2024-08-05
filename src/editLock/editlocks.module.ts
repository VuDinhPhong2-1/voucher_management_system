import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EditLock, EditLockSchema } from './schemas/editLock.schema';
import { EditLocksService } from './editlocks.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EditLock.name, schema: EditLockSchema },
    ]),
  ],
  providers: [EditLocksService],
  exports: [EditLocksService],
})
export class EditLocksModule {}
