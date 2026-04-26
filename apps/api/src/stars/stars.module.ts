import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StarsService } from './stars.service';
import { StarsController } from './stars.controller';
import { FilebaseAccessGuard } from '../files/guards/filebaseAccess.guard';

@Module({
  imports: [AuthModule],
  controllers: [StarsController],
  providers: [StarsService, FilebaseAccessGuard],
  exports: [StarsService],
})
export class StarsModule {}
