import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import axios from 'axios';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly supabaseAnonKey: string;
  private readonly supabase: SupabaseClient;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL') || '';
    const supabaseServiceKey = this.configService.get<string>('SUPABASE_SERVICE_KEY') || '';
    this.supabaseAnonKey = this.configService.get<string>('SUPABASE_ANON_KEY') || '';
    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
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

  async getSignedUrl(
    storagePath: string,
    expiresIn: number = 3600,
  ): Promise<{ signedUrl: string }> {
    this.logger.log(`Generating signed URL for: ${storagePath}`);

    // Parse the storage path to extract bucket and file path
    // Expected format: "bucket-name/path/to/file.ext"
    const pathParts = storagePath.split('/');
    if (pathParts.length < 2) {
      throw new Error('Invalid storage path format. Expected: bucket-name/path/to/file');
    }

    const bucket = pathParts[0];
    const filePath = pathParts.slice(1).join('/');

    const { data, error } = await this.supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      this.logger.error(`Failed to generate signed URL: ${error.message}`);
      throw new Error(`Failed to generate signed URL: ${error.message}`);
    }

    this.logger.log(`Signed URL generated successfully for ${storagePath}`);
    return { signedUrl: data.signedUrl };
  }

  async getSignedUrls(
    storagePaths: string[],
    expiresIn: number = 3600,
  ): Promise<{ signedUrls: { path: string; signedUrl: string | null; error?: string }[] }> {
    this.logger.log(`Generating signed URLs for ${storagePaths.length} paths`);

    const results = await Promise.all(
      storagePaths.map(async (storagePath) => {
        try {
          const { signedUrl } = await this.getSignedUrl(storagePath, expiresIn);
          return { path: storagePath, signedUrl };
        } catch (error: any) {
          this.logger.error(`Failed to generate signed URL for ${storagePath}: ${error.message}`);
          return { path: storagePath, signedUrl: null, error: error.message };
        }
      }),
    );

    return { signedUrls: results };
  }
}
