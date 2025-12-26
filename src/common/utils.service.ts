import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UtilsService {
  generateFilename(): string {
    return uuidv4();
  }

  textToFileBuffer(text: string): Buffer {
    return Buffer.from(text, 'utf-8');
  }
}
