import { Controller, Post, Get, Body, Param, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ProposalsService } from './proposals.service';
import { GenerateProposalDto } from './dto/generate-proposal.dto';

@Controller('product/proposals')
export class ProposalsController {
  private readonly logger = new Logger(ProposalsController.name);

  constructor(
    private readonly proposalsService: ProposalsService,
    @InjectQueue('proposal-generation') private readonly proposalQueue: Queue,
  ) {}

  @Post('generate')
  async generateProposal(@Body() dto: GenerateProposalDto) {
    this.logger.log(`[REQUEST] POST /product/proposals/generate`);

    const startTime = Date.now();
    const result = await this.proposalsService.generateProposal(dto);

    this.logger.log(`[RESPONSE] 200 OK - id: ${result.id} - ${Date.now() - startTime}ms`);
    return result;
  }

  @Get('health/queue')
  async checkQueueHealth() {
    this.logger.log(`[REQUEST] GET /product/proposals/health/queue`);

    try {
      const [waiting, active, completed, failed] = await Promise.all([
        this.proposalQueue.getWaitingCount(),
        this.proposalQueue.getActiveCount(),
        this.proposalQueue.getCompletedCount(),
        this.proposalQueue.getFailedCount(),
      ]);

      const testJob = await this.proposalQueue.add('health-check', {
        test: true,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`[RESPONSE] Queue health check passed - job ${testJob.id} added`);

      return {
        status: 'ok',
        queue: 'proposal-generation',
        redis: 'connected',
        counts: { waiting, active, completed, failed },
        testJob: { id: testJob.id, name: testJob.name },
      };
    } catch (error) {
      this.logger.error(`[RESPONSE] Queue health check failed: ${error.message}`);
      throw new HttpException(
        { status: 'error', message: error.message },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  @Get(':id/render')
  async renderProposal(@Param('id') id: string) {
    this.logger.log(`[REQUEST] GET /product/proposals/${id}/render`);

    const startTime = Date.now();

    try {
      const result = await this.proposalsService.renderProposal(id);
      this.logger.log(`[RESPONSE] 200 OK - rendered ${result.html.length} chars - ${Date.now() - startTime}ms`);
      return result;
    } catch (error) {
      this.logger.error(`[RESPONSE] Render failed: ${error.message}`);
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get(':id')
  async getProposalResult(@Param('id') id: string) {
    this.logger.log(`[REQUEST] GET /product/proposals/${id}`);

    const startTime = Date.now();
    const result = await this.proposalsService.getProposalResult(id);

    if (!result) {
      this.logger.warn(`[RESPONSE] 404 Not Found - id: ${id}`);
      throw new HttpException('Proposal not found', HttpStatus.NOT_FOUND);
    }

    this.logger.log(`[RESPONSE] 200 OK - status: ${result.status} - ${Date.now() - startTime}ms`);

    return {
      status: result.status,
    };
  }
}
