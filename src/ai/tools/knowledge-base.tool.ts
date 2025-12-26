import { KnowledgeBaseService } from '../../knowledge-base/knowledge-base.service';

export class KnowledgeBaseTool {
  constructor(
    private knowledgeBaseService: KnowledgeBaseService,
    private fileStoreName: string,
  ) {}

  async query(question: string): Promise<string> {
    return this.knowledgeBaseService.queryFileStore(this.fileStoreName, question);
  }
}
