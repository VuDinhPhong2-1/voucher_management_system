import { VouchersController } from './voucher/vouchers.controller';
import { VoucherModule } from './voucher/voucher.module';
import { EventsModule } from './event/events.module';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { BullModule } from '@nestjs/bull';
import { TRANSCODE_QUEUE } from './constants/constants';
import { MailerModule } from '@nestjs-modules/mailer';
import { MailerCustomModule } from './mailer/mailer.module';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST'),
          port: configService.get('REDIS_PORT'),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: TRANSCODE_QUEUE,
    }),
    UsersModule,
    AuthModule,
    VoucherModule,
    EventsModule,
    MailerCustomModule,
  ],
  controllers: [VouchersController, AppController],
  providers: [AppService],
})
export class AppModule {}
