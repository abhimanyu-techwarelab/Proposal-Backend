import { Module } from '@nestjs/common';
import { UtilsService } from './utils.service';
import { DataTransformService } from './data-transform.service';

@Module({
  providers: [UtilsService, DataTransformService],
  exports: [UtilsService, DataTransformService],
})
export class CommonModule {}
