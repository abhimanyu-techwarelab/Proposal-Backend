import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class KnowledgeBaseService {
  private readonly logger = new Logger(KnowledgeBaseService.name);
  private readonly geminiApiKey: string;
  private readonly baseUrl = 'https://generativelanguage.googleapis.com';

  constructor(private configService: ConfigService) {
    this.geminiApiKey = this.configService.get<string>('GEMINI_API_KEY') || '';
  }

  async createFileStore(displayName: string): Promise<string> {
    this.logger.log(`Creating file store with name: ${displayName}`);

    try {
      const response = await axios.post(
        `${this.baseUrl}/v1beta/fileSearchStores?key=${this.geminiApiKey}`,
        { displayName },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      const fileStoreName = response.data.name;
      this.logger.log(`File store created: ${fileStoreName}`);
      return fileStoreName;
    } catch (error: any) {
      this.logger.error(`Failed to create file store: ${error.message}`);
      throw new Error(`Failed to create file store: ${error.message}`);
    }
  }

  async uploadFile(fileBuffer: Buffer, mimeType: string, displayName: string): Promise<{ name: string; uri: string }> {
    this.logger.log(`Uploading file: ${displayName}, mimeType: ${mimeType}`);

    try {
      const numBytes = fileBuffer.length;

      const startResponse = await axios.post(
        `${this.baseUrl}/upload/v1beta/files?key=${this.geminiApiKey}`,
        {
          file: {
            display_name: displayName,
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Upload-Protocol': 'resumable',
            'X-Goog-Upload-Command': 'start',
            'X-Goog-Upload-Header-Content-Length': numBytes,
            'X-Goog-Upload-Header-Content-Type': mimeType,
          },
        },
      );

      const uploadUrl = startResponse.headers['x-goog-upload-url'];

      const uploadResponse = await axios.post(uploadUrl, fileBuffer, {
        headers: {
          'Content-Length': numBytes,
          'X-Goog-Upload-Offset': 0,
          'X-Goog-Upload-Command': 'upload, finalize',
        },
      });

      const fileInfo = uploadResponse.data.file;
      this.logger.log(`File uploaded: ${fileInfo.name}`);
      return { name: fileInfo.name, uri: fileInfo.uri };
    } catch (error: any) {
      this.logger.error(`Failed to upload file: ${error.message}`);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  async importFileToStore(fileStoreName: string, fileName: string): Promise<void> {
    this.logger.log(`Importing file ${fileName} to store ${fileStoreName}`);

    try {
      await axios.post(
        `${this.baseUrl}/v1beta/${fileStoreName}:importFile?key=${this.geminiApiKey}`,
        { file_name: fileName },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      this.logger.log(`File ${fileName} imported to store successfully`);
    } catch (error: any) {
      this.logger.error(`Failed to import file to store: ${error.message}`);
      throw new Error(`Failed to import file to store: ${error.message}`);
    }
  }

  async queryFileStore(fileStoreName: string, query: string): Promise<string> {
    this.logger.log(`Querying file store ${fileStoreName} with: ${query.substring(0, 100)}...`);

    try {
      const response = await axios.post(
        `${this.baseUrl}/v1beta/models/gemini-2.0-flash:generateContent?key=${this.geminiApiKey}`,
        {
          contents: [
            {
              parts: [{ text: query }],
            },
          ],
          tools: [
            {
              file_search: {
                file_search_store_names: [fileStoreName],
              },
            },
          ],
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      const result = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      this.logger.log(`Query result received, length: ${result.length}`);
      return result;
    } catch (error: any) {
      this.logger.error(`Failed to query file store: ${error.message}`);
      throw new Error(`Failed to query file store: ${error.message}`);
    }
  }
}
