import { KnowledgeBaseService } from '../../knowledge-base/knowledge-base.service';

export class KnowledgeBaseTool {
  constructor(
    private knowledgeBaseService: KnowledgeBaseService,
    private namespace: string,
  ) {}

  async query(question: string, topK: number = 5): Promise<string> {
    return this.knowledgeBaseService.queryKnowledgeBase(this.namespace, question, topK);
  }
}
