import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly supabaseUrl: string;
  private readonly supabaseAnonKey: string;

  constructor(private configService: ConfigService) {
    this.supabaseUrl = this.configService.get<string>('SUPABASE_URL') || '';
    this.supabaseAnonKey = this.configService.get<string>('SUPABASE_ANON_KEY') || '';
  }

  async downloadAudio(audioPath: string): Promise<Buffer> {
    this.logger.log(`Downloading audio from: ${audioPath}`);

    try {
      const response = await axios.get(audioPath, {
        headers: {
          apikey: this.supabaseAnonKey,
        },
        responseType: 'arraybuffer',
      });

      this.logger.log(`Audio downloaded successfully, size: ${response.data.byteLength} bytes`);
      return Buffer.from(response.data);
    } catch (error: any) {
      this.logger.error(`Failed to download audio from ${audioPath}: ${error.message}`);
      throw new Error(`Failed to download audio: ${error.message}`);
    }
  }

  async downloadDocument(documentPath: string): Promise<Buffer> {
    this.logger.log(`Downloading document from: ${documentPath}`);

    try {
      const response = await axios.get(documentPath, {
        headers: {
          apikey: this.supabaseAnonKey,
        },
        responseType: 'arraybuffer',
      });

      this.logger.log(`Document downloaded successfully, size: ${response.data.byteLength} bytes`);
      return Buffer.from(response.data);
    } catch (error: any) {
      this.logger.error(`Failed to download document from ${documentPath}: ${error.message}`);
      throw new Error(`Failed to download document: ${error.message}`);
    }
  }
}
