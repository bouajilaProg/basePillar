import { Module } from '@nestjs/common';
import { StarsService } from './stars.service';

@Module({
  providers: [StarsService]
})
export class StarsModule {}
