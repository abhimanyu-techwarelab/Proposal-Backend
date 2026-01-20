import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pinecone, Index } from '@pinecone-database/pinecone';
import OpenAI from 'openai';

// Types
interface ChunkMetadata {
  proposalId: string;
  documentName: string;
  chunkIndex: number;
  totalChunks: number;
  sourceType: 'document' | 'transcription';
  text: string;
}

interface DocumentChunk {
  id: string;
  text: string;
  metadata: ChunkMetadata;
}

interface QueryResult {
  text: string;
  score: number;
  documentName: string;
}

@Injectable()
export class KnowledgeBaseService {
  private readonly logger = new Logger(KnowledgeBaseService.name);
  private pinecone: Pinecone;
  private index: Index;
  private openai: OpenAI;

  // Configuration
  private readonly embeddingModel = 'text-embedding-3-large';
  private readonly embeddingDimensions = 3072;
  private readonly chunkSize = 1000;
  private readonly chunkOverlap = 200;

  constructor(private configService: ConfigService) {
    const pineconeApiKey = this.configService.get<string>('PINECONE_API_KEY');
    const indexName = this.configService.get<string>('PINECONE_INDEX_NAME');
    const openaiApiKey = this.configService.get<string>('OPENAI_API_KEY');

    if (!pineconeApiKey) {
      this.logger.warn('[INIT] PINECONE_API_KEY not configured');
    }

    if (!indexName) {
      this.logger.warn('[INIT] PINECONE_INDEX_NAME not configured');
    }

    // Initialize Pinecone
    this.pinecone = new Pinecone({
      apiKey: pineconeApiKey || '',
    });

    if (indexName) {
      this.index = this.pinecone.index(indexName);
    }

    // Initialize OpenAI
    this.openai = new OpenAI({
      apiKey: openaiApiKey || '',
    });

    this.logger.log(`[INIT] KnowledgeBaseService initialized with Pinecone`);
  }

  /**
   * Create a namespace for a proposal
   */
  async createNamespace(proposalId: string): Promise<string> {
    const namespace = `proposal-${proposalId}`;
    this.logger.log(`[NAMESPACE] Created namespace: ${namespace}`);
    return namespace;
  }

  /**
   * Index a document into Pinecone
   */
  async indexDocument(
    namespace: string,
    documentBuffer: Buffer,
    mimeType: string,
    documentName: string,
    proposalId: string,
    sourceType: 'document' | 'transcription' = 'document',
  ): Promise<{ chunksIndexed: number }> {
    const startTime = Date.now();
    this.logger.log(`[INDEX] Starting to index document: ${documentName}`);
    this.logger.log(`[INDEX] Namespace: ${namespace}, MIME type: ${mimeType}`);

    try {
      // 1. Parse document to text
      this.logger.log(`[INDEX] Step 1: Parsing document...`);
      const text = await this.parseDocument(documentBuffer, mimeType);
      this.logger.log(`[INDEX] Parsed text length: ${text.length} characters`);

      if (!text || text.trim().length === 0) {
        this.logger.warn(`[INDEX] Document has no extractable text`);
        return { chunksIndexed: 0 };
      }

      // 2. Chunk text
      this.logger.log(`[INDEX] Step 2: Chunking text...`);
      const chunks = this.chunkText(text, documentName, proposalId, sourceType);
      this.logger.log(`[INDEX] Created ${chunks.length} chunks`);

      if (chunks.length === 0) {
        this.logger.warn(`[INDEX] No chunks created from document`);
        return { chunksIndexed: 0 };
      }

      // 3. Generate embeddings
      this.logger.log(`[INDEX] Step 3: Generating embeddings...`);
      const embeddings = await this.generateEmbeddings(chunks.map(c => c.text));
      this.logger.log(`[INDEX] Generated ${embeddings.length} embeddings`);

      // 4. Upsert to Pinecone
      this.logger.log(`[INDEX] Step 4: Upserting to Pinecone...`);
      await this.upsertVectors(namespace, chunks, embeddings);

      const duration = Date.now() - startTime;
      this.logger.log(`[INDEX] Document indexed successfully in ${duration}ms`);
      this.logger.log(`[INDEX] Result: ${chunks.length} chunks indexed for ${documentName}`);

      return { chunksIndexed: chunks.length };
    } catch (error: any) {
      this.logger.error(`[INDEX] Failed to index document: ${error.message}`);
      this.logger.error(`[INDEX] Stack: ${error.stack}`);
      throw error;
    }
  }

  /**
   * Query the knowledge base for a proposal
   */
  async queryKnowledgeBase(
    namespace: string,
    query: string,
    topK: number = 5,
  ): Promise<string> {
    const startTime = Date.now();
    this.logger.log(`[QUERY] ========== AI KNOWLEDGE BASE QUERY ==========`);
    this.logger.log(`[QUERY] Namespace: ${namespace}`);
    this.logger.log(`[QUERY] Query: "${query}"`);
    this.logger.log(`[QUERY] TopK: ${topK}`);

    try {
      // 1. Generate query embedding
      this.logger.log(`[QUERY] Step 1: Generating query embedding using ${this.embeddingModel}...`);
      const queryEmbeddings = await this.generateEmbeddings([query]);
      const queryEmbedding = queryEmbeddings[0];
      this.logger.log(`[QUERY] Step 1: Embedding generated (${queryEmbedding.length} dimensions)`);

      // 2. Query Pinecone
      this.logger.log(`[QUERY] Step 2: Searching Pinecone vector store...`);
      const results = await this.index.namespace(namespace).query({
        vector: queryEmbedding,
        topK,
        includeMetadata: true,
      });

      // 3. Format results
      const formattedResults: QueryResult[] = results.matches?.map(match => {
        const metadata = match.metadata as unknown as ChunkMetadata;
        return {
          text: metadata?.text || '',
          score: match.score || 0,
          documentName: metadata?.documentName || 'unknown',
        };
      }) || [];

      this.logger.log(`[QUERY] Step 2: Found ${formattedResults.length} matching chunks`);

      // Log each result with relevance score
      if (formattedResults.length > 0) {
        this.logger.log(`[QUERY] Retrieved chunks:`);
        formattedResults.forEach((result, i) => {
          this.logger.log(`[QUERY]   ${i + 1}. "${result.documentName}" - Relevance: ${(result.score * 100).toFixed(1)}% - ${result.text.length} chars`);
        });
      } else {
        this.logger.warn(`[QUERY] No matching chunks found in Pinecone`);
      }

      // 4. Combine into context string
      const contextString = this.formatQueryResults(formattedResults);

      const duration = Date.now() - startTime;
      this.logger.log(`[QUERY] Step 3: Context formatted - ${contextString.length} characters`);
      this.logger.log(`[QUERY] Query completed in ${duration}ms`);
      this.logger.log(`[QUERY] ===============================================`);

      return contextString;
    } catch (error: any) {
      this.logger.error(`[QUERY] FAILED to query knowledge base: ${error.message}`);
      this.logger.error(`[QUERY] Stack: ${error.stack}`);
      throw error;
    }
  }

  /**
   * Delete all vectors for a proposal namespace
   */
  async deleteNamespace(namespace: string): Promise<void> {
    this.logger.log(`[DELETE] Deleting namespace: ${namespace}`);

    try {
      await this.index.namespace(namespace).deleteAll();
      this.logger.log(`[DELETE] Namespace deleted successfully: ${namespace}`);
    } catch (error: any) {
      this.logger.error(`[DELETE] Failed to delete namespace: ${error.message}`);
      throw error;
    }
  }

  // === PRIVATE HELPER METHODS ===

  async parseDocument(buffer: Buffer, mimeType: string): Promise<string> {
    this.logger.debug(`[PARSE] Parsing document with MIME type: ${mimeType}`);

    try {
      switch (mimeType) {
        case 'application/pdf':
          return await this.parsePDF(buffer);

        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          return await this.parseDOCX(buffer);

        case 'application/msword':
          // Old .doc format - try to read as text or use docx parser
          this.logger.warn(`[PARSE] .doc format not fully supported, attempting text extraction`);
          return buffer.toString('utf-8');

        case 'text/plain':
        case 'text/markdown':
          return buffer.toString('utf-8');

        case 'application/json':
          return JSON.stringify(JSON.parse(buffer.toString('utf-8')), null, 2);

        case 'text/csv':
          return buffer.toString('utf-8');

        default:
          // Attempt to read as text for unknown types
          this.logger.warn(`[PARSE] Unknown MIME type ${mimeType}, attempting text extraction`);
          return buffer.toString('utf-8');
      }
    } catch (error: any) {
      this.logger.error(`[PARSE] Error parsing document: ${error.message}`);
      throw new Error(`Failed to parse document: ${error.message}`);
    }
  }

  private async parsePDF(buffer: Buffer): Promise<string> {
    this.logger.debug(`[PARSE] Parsing PDF document...`);
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(buffer);
    this.logger.debug(`[PARSE] PDF parsed: ${data.numpages} pages, ${data.text.length} characters`);
    return data.text;
  }

  private async parseDOCX(buffer: Buffer): Promise<string> {
    this.logger.debug(`[PARSE] Parsing DOCX document...`);
    const mammoth = require('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    this.logger.debug(`[PARSE] DOCX parsed: ${result.value.length} characters`);
    return result.value;
  }

  private chunkText(
    text: string,
    documentName: string,
    proposalId: string,
    sourceType: 'document' | 'transcription',
  ): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const cleanText = text.replace(/\s+/g, ' ').trim();

    if (cleanText.length === 0) {
      return chunks;
    }

    let start = 0;
    let chunkIndex = 0;

    while (start < cleanText.length) {
      const end = Math.min(start + this.chunkSize, cleanText.length);
      const chunkText = cleanText.slice(start, end);

      chunks.push({
        id: `${proposalId}-${documentName.replace(/[^a-zA-Z0-9]/g, '_')}-${chunkIndex}`,
        text: chunkText,
        metadata: {
          proposalId,
          documentName,
          chunkIndex,
          totalChunks: 0, // Will be updated
          sourceType,
          text: chunkText,
        },
      });

      // Move start position with overlap
      start = end - this.chunkOverlap;
      if (start >= cleanText.length - this.chunkOverlap) break;
      chunkIndex++;
    }

    // Update totalChunks in metadata
    chunks.forEach(chunk => {
      chunk.metadata.totalChunks = chunks.length;
    });

    this.logger.debug(`[CHUNK] Created ${chunks.length} chunks from ${cleanText.length} characters`);
    return chunks;
  }

  private async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const batchSize = 100; // OpenAI limit
    const allEmbeddings: number[][] = [];

    this.logger.debug(`[EMBED] Generating embeddings for ${texts.length} texts`);

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(texts.length / batchSize);

      this.logger.debug(`[EMBED] Processing batch ${batchNum}/${totalBatches} (${batch.length} texts)`);

      try {
        const response = await this.openai.embeddings.create({
          model: this.embeddingModel,
          input: batch,
          dimensions: this.embeddingDimensions,
        });

        allEmbeddings.push(...response.data.map(d => d.embedding));
        this.logger.debug(`[EMBED] Batch ${batchNum} completed`);
      } catch (error: any) {
        this.logger.error(`[EMBED] Batch ${batchNum} failed: ${error.message}`);
        throw error;
      }
    }

    this.logger.debug(`[EMBED] Generated ${allEmbeddings.length} embeddings`);
    return allEmbeddings;
  }

  private async upsertVectors(
    namespace: string,
    chunks: DocumentChunk[],
    embeddings: number[][],
  ): Promise<void> {
    const vectors = chunks.map((chunk, i) => ({
      id: chunk.id,
      values: embeddings[i],
      metadata: chunk.metadata as Record<string, any>,
    }));

    // Pinecone upsert in batches of 100
    const batchSize = 100;
    const totalBatches = Math.ceil(vectors.length / batchSize);

    this.logger.debug(`[UPSERT] Upserting ${vectors.length} vectors in ${totalBatches} batches`);

    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;

      try {
        await this.index.namespace(namespace).upsert(batch);
        this.logger.debug(`[UPSERT] Batch ${batchNum}/${totalBatches} completed`);
      } catch (error: any) {
        this.logger.error(`[UPSERT] Batch ${batchNum} failed: ${error.message}`);
        throw error;
      }
    }

    this.logger.log(`[UPSERT] Successfully upserted ${vectors.length} vectors to namespace: ${namespace}`);
  }

  private formatQueryResults(results: QueryResult[]): string {
    if (results.length === 0) {
      return 'No relevant information found in the knowledge base.';
    }

    return results
      .map((r, i) => `[Source: ${r.documentName}, Relevance: ${(r.score * 100).toFixed(1)}%]\n${r.text}`)
      .join('\n\n---\n\n');
  }
}
