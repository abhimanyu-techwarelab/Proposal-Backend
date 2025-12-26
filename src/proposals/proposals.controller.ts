import { Controller, Post, Get, Body, Param, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ProposalsService } from './proposals.service';
import { GenerateProposalDto } from './dto/generate-proposal.dto';

@Controller('proposals')
export class ProposalsController {
  private readonly logger = new Logger(ProposalsController.name);

  constructor(private readonly proposalsService: ProposalsService) {}

  @Post('generate')
  async generateProposal(@Body() dto: GenerateProposalDto) {
    this.logger.log(`[REQUEST] POST /proposals/generate`);
    this.logger.log(`[REQUEST] proposal_id: ${dto.proposal_id}`);

    const startTime = Date.now();
    const result = await this.proposalsService.generateProposal(dto);

    this.logger.log(`[RESPONSE] 200 OK - ${Date.now() - startTime}ms`);
    return result;
  }

  @Get(':id/result')
  async getProposalResult(@Param('id') id: string) {
    this.logger.log(`[REQUEST] GET /proposals/${id}/result`);

    const startTime = Date.now();
    const result = await this.proposalsService.getProposalResult(id);

    if (!result) {
      this.logger.warn(`[RESPONSE] 404 Not Found - proposal_id: ${id}`);
      throw new HttpException('Proposal not found', HttpStatus.NOT_FOUND);
    }

    this.logger.log(`[RESPONSE] 200 OK - status: ${result.status} - ${Date.now() - startTime}ms`);

    return {
      status: result.status,
      pdf_code: result.pdf_code,
      error: result.error,
    };
  }
}
