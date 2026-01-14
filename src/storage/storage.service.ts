import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import axios from "axios";

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly supabaseAnonKey: string;
  private readonly supabase: SupabaseClient;
  private readonly supabaseUrl: string;

  constructor(private configService: ConfigService) {
    this.supabaseUrl = this.configService.get<string>("SUPABASE_URL") || "";
    const supabaseServiceKey =
      this.configService.get<string>("SUPABASE_SERVICE_KEY") || "";
    this.supabaseAnonKey =
      this.configService.get<string>("SUPABASE_ANON_KEY") || "";
    this.supabase = createClient(this.supabaseUrl, supabaseServiceKey);
  }

  async downloadAudio(audioPath: string): Promise<Buffer> {
    this.logger.log(`Downloading audio from: ${audioPath}`);

    try {
      const response = await axios.get(audioPath, {
        headers: {
          apikey: this.supabaseAnonKey,
        },
        responseType: "arraybuffer",
      });

      this.logger.log(
        `Audio downloaded successfully, size: ${response.data.byteLength} bytes`
      );
      return Buffer.from(response.data);
    } catch (error: any) {
      this.logger.error(
        `Failed to download audio from ${audioPath}: ${error.message}`
      );
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
        responseType: "arraybuffer",
      });

      this.logger.log(
        `Document downloaded successfully, size: ${response.data.byteLength} bytes`
      );
      return Buffer.from(response.data);
    } catch (error: any) {
      this.logger.error(
        `Failed to download document from ${documentPath}: ${error.message}`
      );
      throw new Error(`Failed to download document: ${error.message}`);
    }
  }

  async getSignedUrl(
    storagePath: string,
    expiresIn: number = 3600
  ): Promise<{ signedUrl: string }> {
    this.logger.log(`Generating signed URL for: ${storagePath}`);

    // Parse the storage path to extract bucket and file path
    // Expected format: "bucket-name/path/to/file.ext"
    const pathParts = storagePath.split("/");
    if (pathParts.length < 2) {
      throw new Error(
        "Invalid storage path format. Expected: bucket-name/path/to/file"
      );
    }

    const bucket = pathParts[0];
    const filePath = pathParts.slice(1).join("/");

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
    expiresIn: number = 3600
  ): Promise<{
    signedUrls: { path: string; signedUrl: string | null; error?: string }[];
  }> {
    this.logger.log(`Generating signed URLs for ${storagePaths.length} paths`);

    const results = await Promise.all(
      storagePaths.map(async (storagePath) => {
        try {
          const { signedUrl } = await this.getSignedUrl(storagePath, expiresIn);
          return { path: storagePath, signedUrl };
        } catch (error: any) {
          this.logger.error(
            `Failed to generate signed URL for ${storagePath}: ${error.message}`
          );
          return { path: storagePath, signedUrl: null, error: error.message };
        }
      })
    );

    return { signedUrls: results };
  }

  async uploadFile(
    bucket: string,
    filePath: string,
    fileBuffer: Buffer,
    contentType: string
  ): Promise<string> {
    this.logger.log(`Uploading file to ${bucket}/${filePath}`);

    const { data, error } = await this.supabase.storage
      .from(bucket)
      .upload(filePath, fileBuffer, {
        contentType,
        upsert: true,
      });

    if (error) {
      this.logger.error(`Failed to upload file: ${error.message}`);
      throw new Error(`Failed to upload file: ${error.message}`);
    }

    this.logger.log(`File uploaded successfully to ${bucket}/${filePath}`);

    // Construct and return the public URL for the uploaded file
    // Format: {SUPABASE_URL}/storage/v1/object/public/{bucket}/{filePath}
    const publicUrl = `${this.supabaseUrl}/storage/v1/object/public/${bucket}/${filePath}`;
    this.logger.log(`Public URL: ${publicUrl}`);

    return publicUrl;
  }

  async deleteFile(imageUrl: string): Promise<void> {
    if (!imageUrl) {
      this.logger.warn("[DELETE_FILE] No image URL provided");
      return;
    }

    try {
      // Extract bucket and file path from URL
      // URL format: https://[project].supabase.co/storage/v1/object/public/template_display_image/[template_id]/image.jpeg
      const url = new URL(imageUrl);
      const pathParts = url.pathname.split("/");

      // Find the bucket name and file path
      const bucketIndex = pathParts.indexOf("public");
      if (bucketIndex === -1 || bucketIndex === pathParts.length - 1) {
        this.logger.warn(`[DELETE_FILE] Invalid image URL format: ${imageUrl}`);
        return;
      }

      const bucket = pathParts[bucketIndex + 1];
      const filePath = pathParts.slice(bucketIndex + 2).join("/");

      if (!bucket || !filePath) {
        this.logger.warn(
          `[DELETE_FILE] Could not extract bucket or file path from URL: ${imageUrl}`
        );
        return;
      }

      this.logger.log(`[DELETE_FILE] Deleting file from ${bucket}/${filePath}`);

      // Delete file from storage
      const { error } = await this.supabase.storage
        .from(bucket)
        .remove([filePath]);

      if (error) {
        this.logger.error(
          `[DELETE_FILE] Failed to delete file: ${error.message}`
        );
        // Don't throw - deletion failure shouldn't block the update
        this.logger.warn(
          "[DELETE_FILE] Failed to delete old image, but continuing with update"
        );
      } else {
        this.logger.log(
          `[DELETE_FILE] File deleted successfully from ${bucket}/${filePath}`
        );
      }
    } catch (error: any) {
      this.logger.error(
        `[DELETE_FILE] Error parsing image URL for deletion: ${error.message}`
      );
      // Don't throw - deletion failure shouldn't block the update
    }
  }
}
