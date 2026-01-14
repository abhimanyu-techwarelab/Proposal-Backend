import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { StorageService } from "./storage.service";
import { GetSignedUrlDto, GetSignedUrlsDto } from "./dto/get-signed-url.dto";

@ApiTags("storage")
@Controller("storage")
export class StorageController {
  private readonly logger = new Logger(StorageController.name);

  constructor(private readonly storageService: StorageService) {}

  @Post("signed-url")
  @ApiOperation({
    summary: "Get signed URL for file upload",
    description:
      "Generates a pre-signed URL for uploading a single file to storage. The URL expires after the specified time.",
  })
  @ApiResponse({
    status: 200,
    description: "Signed URL generated successfully",
    schema: {
      type: "object",
      properties: {
        signedUrl: {
          type: "string",
          description: "Pre-signed URL for file upload",
          example: "https://storage.example.com/path/to/file?signature=...",
        },
        storagePath: {
          type: "string",
          description: "Storage path where the file will be stored",
          example: "uploads/documents/file.pdf",
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Bad request - invalid storage path or parameters",
  })
  async getSignedUrl(@Body() dto: GetSignedUrlDto) {
    this.logger.log(`[REQUEST] POST /storage/signed-url`);
    this.logger.log(`[REQUEST] storagePath: ${dto.storagePath}`);

    try {
      const result = await this.storageService.getSignedUrl(
        dto.storagePath,
        dto.expiresIn
      );

      this.logger.log(`[RESPONSE] 200 OK - signed URL generated`);
      return result;
    } catch (error: any) {
      this.logger.error(`[RESPONSE] 400 Bad Request - ${error.message}`);
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post("signed-urls")
  @ApiOperation({
    summary: "Get multiple signed URLs for file uploads",
    description:
      "Generates pre-signed URLs for uploading multiple files to storage. All URLs expire after the specified time.",
  })
  @ApiResponse({
    status: 200,
    description: "Signed URLs generated successfully",
    schema: {
      type: "object",
      properties: {
        signedUrls: {
          type: "array",
          items: {
            type: "object",
            properties: {
              storagePath: {
                type: "string",
                example: "uploads/documents/file1.pdf",
              },
              signedUrl: {
                type: "string",
                example: "https://storage.example.com/path?signature=...",
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Bad request - invalid storage paths or parameters",
  })
  async getSignedUrls(@Body() dto: GetSignedUrlsDto) {
    this.logger.log(`[REQUEST] POST /storage/signed-urls`);
    this.logger.log(`[REQUEST] storagePaths count: ${dto.storagePaths.length}`);

    try {
      const result = await this.storageService.getSignedUrls(
        dto.storagePaths,
        dto.expiresIn
      );

      this.logger.log(
        `[RESPONSE] 200 OK - ${result.signedUrls.length} signed URLs generated`
      );
      return result;
    } catch (error: any) {
      this.logger.error(`[RESPONSE] 400 Bad Request - ${error.message}`);
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}
