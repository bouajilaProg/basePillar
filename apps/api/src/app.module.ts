import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { FilesModule } from './files/files.module';
import { DbModule } from './db/db.module';
import { StarsModule } from './stars/stars.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    DbModule,
    AuthModule,
    FilesModule,
    StarsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
