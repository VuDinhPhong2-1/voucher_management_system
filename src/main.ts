import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { TransformInterceptor } from './core/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // config Reflector
  const reflector = app.get(Reflector);

  // config interceptors 
  app.useGlobalInterceptors(new TransformInterceptor(reflector));

  // setup config CORS
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    credentials: true, // cho phép giữa clien và server trao đổi
  });
  // config Swagger document
  const config = new DocumentBuilder()
    .setTitle('API BACKEND NESTJS')
    .setDescription('The API description')
    .setVersion('1.0')
    //.addTag('cats')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth', // This name here is important for matching up with @ApiBearerAuth() in your controller!
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('swagger', app, document, {
    swaggerOptions: {
      persisAuthorization: true,
    },
  });
  await app.listen(3000);
}
bootstrap();
