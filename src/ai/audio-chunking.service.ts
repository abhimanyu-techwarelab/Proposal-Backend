import { Injectable, Logger } from '@nestjs/common';
import ffmpeg from 'fluent-ffmpeg';
import * as ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

// Configuration constants
const WHISPER_MAX_SIZE_MB = 25;
const WHISPER_MAX_SIZE_BYTES = WHISPER_MAX_SIZE_MB * 1024 * 1024;
const TARGET_CHUNK_DURATION_SECONDS = 300; // 5 minutes - safe default
const CHUNK_OVERLAP_SECONDS = 2; // 2 second overlap to avoid cutting words
const MAX_CHUNKS = 100; // Safety limit
const MAX_FILE_SIZE_MB = 500; // 500MB max file size

export interface AudioChunk {
  index: number;
  buffer: Buffer;
  startTime: number; // seconds
  endTime: number; // seconds
  filename: string;
}

export interface ChunkingResult {
  chunks: AudioChunk[];
  totalDuration: number;
  originalFormat: string;
}

export interface AudioMetadata {
  duration: number; // seconds
  format: string;
  bitrate: number; // kbps
  sampleRate: number;
  channels: number;
  fileSize: number; // bytes
}

export interface TranscriptionChunk {
  index: number;
  text: string;
  startTime: number;
  endTime: number;
}

@Injectable()
export class AudioChunkingService {
  private readonly logger = new Logger(AudioChunkingService.name);
  private readonly tempDir: string;

  constructor() {
    // Set ffmpeg path from static binary
    ffmpeg.setFfmpegPath(ffmpegInstaller.path);
    this.tempDir = path.join(os.tmpdir(), 'audio-chunks');
    this.ensureTempDir();
  }

  private async ensureTempDir(): Promise<void> {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error: any) {
      this.logger.warn(`Could not create temp dir: ${error.message}`);
    }
  }

  /**
   * Check if audio buffer needs chunking based on size
   */
  needsChunking(audioBuffer: Buffer): boolean {
    return audioBuffer.length > WHISPER_MAX_SIZE_BYTES;
  }

  /**
   * Validate audio buffer before processing
   */
  async validateAudio(
    audioBuffer: Buffer,
  ): Promise<{ valid: boolean; error?: string }> {
    if (!audioBuffer || audioBuffer.length === 0) {
      return { valid: false, error: 'Empty audio buffer' };
    }

    // Check for minimum size (at least 1KB)
    if (audioBuffer.length < 1024) {
      return { valid: false, error: 'Audio file too small' };
    }

    // Check for maximum size
    const maxSize = MAX_FILE_SIZE_MB * 1024 * 1024;
    if (audioBuffer.length > maxSize) {
      return { valid: false, error: `Audio file exceeds ${MAX_FILE_SIZE_MB}MB limit` };
    }

    try {
      const metadata = await this.getAudioMetadata(audioBuffer);

      // Check for valid duration
      if (metadata.duration <= 0) {
        return { valid: false, error: 'Invalid audio duration' };
      }

      // Warn for very long files (over 2 hours)
      if (metadata.duration > 7200) {
        this.logger.warn(
          `[VALIDATE] Very long audio file: ${metadata.duration}s`,
        );
      }

      return { valid: true };
    } catch (error: any) {
      return { valid: false, error: `Audio validation failed: ${error.message}` };
    }
  }

  /**
   * Get audio file metadata using ffprobe
   */
  async getAudioMetadata(audioBuffer: Buffer): Promise<AudioMetadata> {
    const tempFile = await this.writeBufferToTemp(audioBuffer, 'input');

    try {
      return await new Promise((resolve, reject) => {
        ffmpeg.ffprobe(tempFile, (err, metadata) => {
          if (err) {
            reject(new Error(`Failed to probe audio: ${err.message}`));
            return;
          }

          const audioStream = metadata.streams.find(
            (s) => s.codec_type === 'audio',
          );
          if (!audioStream) {
            reject(new Error('No audio stream found in file'));
            return;
          }

          resolve({
            duration: metadata.format.duration || 0,
            format: metadata.format.format_name || 'unknown',
            bitrate: (metadata.format.bit_rate || 0) / 1000,
            sampleRate: audioStream.sample_rate
              ? parseInt(audioStream.sample_rate.toString())
              : 44100,
            channels: audioStream.channels || 1,
            fileSize: audioBuffer.length,
          });
        });
      });
    } finally {
      await this.cleanupTempFile(tempFile);
    }
  }

  /**
   * Calculate optimal chunk duration based on file characteristics
   */
  calculateOptimalChunkDuration(metadata: AudioMetadata): number {
    // Estimate bytes per second
    const bytesPerSecond = metadata.fileSize / metadata.duration;

    // Calculate duration that would result in ~20MB chunks (leaving safety margin)
    const targetBytes = 20 * 1024 * 1024; // 20MB target
    const optimalDuration = targetBytes / bytesPerSecond;

    // Clamp between 2 minutes and 10 minutes
    return Math.max(120, Math.min(optimalDuration, 600));
  }

  /**
   * Split audio buffer into chunks
   */
  async chunkAudio(
    audioBuffer: Buffer,
    format: string = 'mp3',
  ): Promise<ChunkingResult> {
    const startTime = Date.now();
    this.logger.log(
      `[CHUNK] Starting audio chunking, size: ${audioBuffer.length} bytes`,
    );

    // Get metadata
    const metadata = await this.getAudioMetadata(audioBuffer);
    this.logger.log(
      `[CHUNK] Audio metadata: duration=${metadata.duration}s, format=${metadata.format}, bitrate=${metadata.bitrate}kbps`,
    );

    // Check if chunking is needed
    if (!this.needsChunking(audioBuffer)) {
      this.logger.log(`[CHUNK] File under 25MB, no chunking needed`);
      return {
        chunks: [
          {
            index: 0,
            buffer: audioBuffer,
            startTime: 0,
            endTime: metadata.duration,
            filename: `chunk_0.${format}`,
          },
        ],
        totalDuration: metadata.duration,
        originalFormat: metadata.format,
      };
    }

    // Calculate chunk duration
    const chunkDuration = this.calculateOptimalChunkDuration(metadata);
    this.logger.log(`[CHUNK] Using chunk duration: ${chunkDuration}s`);

    // Write input to temp file
    const inputFile = await this.writeBufferToTemp(audioBuffer, 'input');

    try {
      const chunks: AudioChunk[] = [];
      let currentStart = 0;
      let chunkIndex = 0;

      while (currentStart < metadata.duration) {
        // Add overlap for non-first chunks to avoid cutting words
        const effectiveStart =
          chunkIndex === 0
            ? 0
            : Math.max(0, currentStart - CHUNK_OVERLAP_SECONDS);
        const effectiveEnd = Math.min(
          currentStart + chunkDuration,
          metadata.duration,
        );

        const chunkBuffer = await this.extractChunk(
          inputFile,
          effectiveStart,
          effectiveEnd - effectiveStart,
          format,
        );

        chunks.push({
          index: chunkIndex,
          buffer: chunkBuffer,
          startTime: effectiveStart,
          endTime: effectiveEnd,
          filename: `chunk_${chunkIndex}.${format}`,
        });

        this.logger.log(
          `[CHUNK] Created chunk ${chunkIndex}: ${effectiveStart}s - ${effectiveEnd}s, size: ${chunkBuffer.length} bytes`,
        );

        currentStart = effectiveEnd;
        chunkIndex++;

        // Safety check for very long files
        if (chunkIndex > MAX_CHUNKS) {
          throw new Error(`Audio file too long: exceeded ${MAX_CHUNKS} chunks`);
        }
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `[CHUNK] Chunking complete: ${chunks.length} chunks in ${duration}ms`,
      );

      return {
        chunks,
        totalDuration: metadata.duration,
        originalFormat: metadata.format,
      };
    } finally {
      await this.cleanupTempFile(inputFile);
    }
  }

  /**
   * Extract a single chunk from the audio file
   */
  private async extractChunk(
    inputFile: string,
    startTime: number,
    duration: number,
    format: string,
  ): Promise<Buffer> {
    const outputFile = path.join(this.tempDir, `${uuidv4()}.${format}`);

    return new Promise((resolve, reject) => {
      ffmpeg(inputFile)
        .setStartTime(startTime)
        .setDuration(duration)
        .audioCodec('libmp3lame')
        .audioBitrate('128k')
        .audioChannels(1) // Mono reduces file size
        .audioFrequency(16000) // 16kHz is sufficient for speech
        .output(outputFile)
        .on('end', async () => {
          try {
            const buffer = await fs.readFile(outputFile);
            await this.cleanupTempFile(outputFile);
            resolve(buffer);
          } catch (err) {
            reject(err);
          }
        })
        .on('error', (err) => {
          this.cleanupTempFile(outputFile).catch(() => {});
          reject(new Error(`FFmpeg error: ${err.message}`));
        })
        .run();
    });
  }

  /**
   * Merge transcriptions from chunks, handling overlaps
   */
  mergeTranscriptions(transcriptions: TranscriptionChunk[]): string {
    if (transcriptions.length === 0) return '';
    if (transcriptions.length === 1) return transcriptions[0].text;

    // Sort by index
    const sorted = [...transcriptions].sort((a, b) => a.index - b.index);

    // Simple merge: join with space, relying on the overlap to provide context
    const mergedParts: string[] = [];

    for (let i = 0; i < sorted.length; i++) {
      let text = sorted[i].text.trim();

      // For chunks after the first, try to remove duplicate content from overlap
      if (i > 0 && text.length > 0) {
        const prevText = mergedParts[mergedParts.length - 1] || '';
        text = this.removeDuplicateOverlap(prevText, text);
      }

      if (text.length > 0) {
        mergedParts.push(text);
      }
    }

    return mergedParts.join(' ');
  }

  /**
   * Remove duplicate content that may appear due to chunk overlap
   */
  private removeDuplicateOverlap(
    prevText: string,
    currentText: string,
  ): string {
    // Get last ~100 characters of previous text
    const overlapCheckLength = 100;
    const prevEnd = prevText.slice(-overlapCheckLength).toLowerCase();
    const currStart = currentText
      .slice(0, overlapCheckLength * 2)
      .toLowerCase();

    // Try to find where the overlap ends
    const words = prevEnd.split(/\s+/).filter((w) => w.length > 3);

    for (const word of words.reverse()) {
      const idx = currStart.indexOf(word);
      if (idx !== -1 && idx < overlapCheckLength) {
        // Found overlap, skip to after this word in current text
        const skipTo =
          currentText.toLowerCase().indexOf(word) + word.length;
        const afterWord = currentText.slice(skipTo).trim();
        if (afterWord.length > 0) {
          return afterWord;
        }
      }
    }

    return currentText;
  }

  /**
   * Helper: Write buffer to temp file
   */
  private async writeBufferToTemp(
    buffer: Buffer,
    prefix: string,
  ): Promise<string> {
    const filename = path.join(this.tempDir, `${prefix}_${uuidv4()}`);
    await fs.writeFile(filename, buffer);
    return filename;
  }

  /**
   * Helper: Clean up temp file
   */
  private async cleanupTempFile(filepath: string): Promise<void> {
    try {
      await fs.unlink(filepath);
    } catch (error: any) {
      this.logger.warn(
        `[CLEANUP] Could not delete temp file ${filepath}: ${error.message}`,
      );
    }
  }
}
