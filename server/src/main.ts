import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Enable CORS for client app
  const corsOriginEnv = process.env.CORS_ORIGIN;
  const origin = corsOriginEnv
    ? corsOriginEnv.split(',').map((s) => s.trim())
    : true; // allow all in dev by default
  app.enableCors({
    origin,
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
