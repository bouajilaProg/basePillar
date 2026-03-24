import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
// Use require for cookie-parser (CommonJS module)
import { createLogger } from '@repo/logger';
const cookieParser = require('cookie-parser');
import { AppModule } from './app.module';
import { AppExceptionFilter } from './common/filters/app-exception.filter';

const logger = createLogger({
  appName: 'api',
  color: '#e84e31',
  consoleUrl: process.env.CENTRALIZED_CONSOLE_URL,
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix
  app.setGlobalPrefix('api');

  // Cookie parser for JWT cookie auth
  app.use(cookieParser());

  // Global validation pipe with class-validator
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );

  // Global exception filter for AppException
  app.useGlobalFilters(new AppExceptionFilter(logger));

  // CORS configuration
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  });

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('BasePillar API')
    .setDescription('Full-stack monorepo API with JWT cookie authentication')
    .setVersion('1.0')
    .addCookieAuth('access_token', {
      type: 'apiKey',
      in: 'cookie',
      name: 'access_token',
    })
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.info('API Server started', {
    port,
    docs: `http://localhost:${port}/docs`,
    env: process.env.NODE_ENV || 'development',
  });
}

bootstrap();
