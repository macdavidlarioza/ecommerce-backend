import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
  origin: [
    'http://localhost:5173',                          // local dev
    'https://e-commerce-app-three-smoky.vercel.app',  // your Vercel URL
  ],
  credentials: true,
});

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();