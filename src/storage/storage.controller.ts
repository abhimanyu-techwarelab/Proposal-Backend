import { Controller, Post, Body, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { StorageService } from './storage.service';
import { GetSignedUrlDto, GetSignedUrlsDto } from './dto/get-signed-url.dto';

@Controller('storage')
export class StorageController {
  private readonly logger = new Logger(StorageController.name);

  constructor(private readonly storageService: StorageService) {}

  @Post('signed-url')
  async getSignedUrl(@Body() dto: GetSignedUrlDto) {
    this.logger.log(`[REQUEST] POST /storage/signed-url`);
    this.logger.log(`[REQUEST] storagePath: ${dto.storagePath}`);

    try {
      const result = await this.storageService.getSignedUrl(
        dto.storagePath,
        dto.expiresIn,
      );

      this.logger.log(`[RESPONSE] 200 OK - signed URL generated`);
      return result;
    } catch (error: any) {
      this.logger.error(`[RESPONSE] 400 Bad Request - ${error.message}`);
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('signed-urls')
  async getSignedUrls(@Body() dto: GetSignedUrlsDto) {
    this.logger.log(`[REQUEST] POST /storage/signed-urls`);
    this.logger.log(`[REQUEST] storagePaths count: ${dto.storagePaths.length}`);

    try {
      const result = await this.storageService.getSignedUrls(
        dto.storagePaths,
        dto.expiresIn,
      );

      this.logger.log(`[RESPONSE] 200 OK - ${result.signedUrls.length} signed URLs generated`);
      return result;
    } catch (error: any) {
      this.logger.error(`[RESPONSE] 400 Bad Request - ${error.message}`);
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}
