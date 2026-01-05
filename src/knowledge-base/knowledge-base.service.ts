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
      this.logger.log(`File uploaded: ${fileInfo.name}, state: ${fileInfo.state}`);
      return { name: fileInfo.name, uri: fileInfo.uri };
    } catch (error: any) {
      this.logger.error(`Failed to upload file: ${error.message}`);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  async getFileStatus(fileName: string): Promise<{ state: string; name: string }> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/v1beta/${fileName}?key=${this.geminiApiKey}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      return {
        state: response.data.state || 'UNKNOWN',
        name: response.data.name,
      };
    } catch (error: any) {
      this.logger.error(`Failed to get file status: ${error.message}`);
      throw new Error(`Failed to get file status: ${error.message}`);
    }
  }

  async waitForFileActive(fileName: string, maxWaitMs: number = 30000, pollIntervalMs: number = 2000): Promise<boolean> {
    this.logger.log(`[FILE] Waiting for file to be ACTIVE: ${fileName}`);
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      const fileStatus = await this.getFileStatus(fileName);
      this.logger.log(`[FILE] ${fileName} state: ${fileStatus.state}`);

      if (fileStatus.state === 'ACTIVE') {
        this.logger.log(`[FILE] File is now ACTIVE: ${fileName}`);
        return true;
      }

      if (fileStatus.state === 'FAILED') {
        this.logger.error(`[FILE] File processing FAILED: ${fileName}`);
        return false;
      }

      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }

    this.logger.warn(`[FILE] Timeout waiting for file to be ACTIVE: ${fileName}`);
    return false;
  }

  async importFileToStore(fileStoreName: string, fileName: string): Promise<void> {
    this.logger.log(`Importing file ${fileName} to store ${fileStoreName}`);

    try {
      // Gemini API expects 'fileName' field (camelCase) with the file resource name
      await axios.post(
        `${this.baseUrl}/v1beta/${fileStoreName}:importFile?key=${this.geminiApiKey}`,
        { fileName: fileName },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      this.logger.log(`File ${fileName} imported to store successfully`);
    } catch (error: any) {
      // Log detailed error response for debugging
      if (error.response) {
        this.logger.error(`Import file failed - Status: ${error.response.status}`);
        this.logger.error(`Import file failed - Response: ${JSON.stringify(error.response.data)}`);
      }
      this.logger.error(`Failed to import file to store: ${error.message}`);
      throw new Error(`Failed to import file to store: ${error.message}`);
    }
  }

  async getFileStoreStatus(fileStoreName: string): Promise<{
    activeDocumentsCount: number;
    pendingDocumentsCount: number;
    failedDocumentsCount: number;
  }> {
    this.logger.log(`[FILE STORE STATUS] Checking status of: ${fileStoreName}`);

    try {
      const response = await axios.get(
        `${this.baseUrl}/v1beta/${fileStoreName}?key=${this.geminiApiKey}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      const status = {
        activeDocumentsCount: response.data.activeDocumentsCount || 0,
        pendingDocumentsCount: response.data.pendingDocumentsCount || 0,
        failedDocumentsCount: response.data.failedDocumentsCount || 0,
      };

      this.logger.log(`[FILE STORE STATUS] Active: ${status.activeDocumentsCount}, Pending: ${status.pendingDocumentsCount}, Failed: ${status.failedDocumentsCount}`);
      return status;
    } catch (error: any) {
      this.logger.error(`Failed to get file store status: ${error.message}`);
      throw new Error(`Failed to get file store status: ${error.message}`);
    }
  }

  async waitForFilesReady(fileStoreName: string, maxWaitMs: number = 60000, pollIntervalMs: number = 2000): Promise<boolean> {
    this.logger.log(`[FILE STORE] Waiting for files to be indexed in: ${fileStoreName}`);
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      const status = await this.getFileStoreStatus(fileStoreName);

      if (status.pendingDocumentsCount === 0) {
        if (status.failedDocumentsCount > 0) {
          this.logger.warn(`[FILE STORE] ${status.failedDocumentsCount} document(s) failed to index`);
        }
        if (status.activeDocumentsCount > 0) {
          this.logger.log(`[FILE STORE] All files indexed successfully - ${status.activeDocumentsCount} active document(s)`);
          return true;
        }
        this.logger.log(`[FILE STORE] No pending documents, active: ${status.activeDocumentsCount}`);
        return status.activeDocumentsCount > 0;
      }

      this.logger.log(`[FILE STORE] Still indexing... Pending: ${status.pendingDocumentsCount}, Active: ${status.activeDocumentsCount}`);
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }

    this.logger.warn(`[FILE STORE] Timeout waiting for files to be indexed`);
    return false;
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
