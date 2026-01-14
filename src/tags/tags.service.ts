import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tag } from './entities/tag.entity';

@Injectable()
export class TagsService {
  private readonly logger = new Logger(TagsService.name);

  constructor(
    @InjectRepository(Tag)
    private tagRepository: Repository<Tag>,
  ) {
    this.logger.log(`[INIT] TagsService initialized`);
  }

  async findAll(page?: number, limit?: number): Promise<Tag[] | { data: Tag[]; total: number; page: number; limit: number; totalPages: number }> {
    this.logger.log(`[FIND_ALL] Fetching tags - page: ${page}, limit: ${limit}`);

    if (page !== undefined && limit !== undefined) {
      const skip = (page - 1) * limit;

      const [tags, total] = await this.tagRepository.findAndCount({
        order: { created_at: 'DESC' },
        skip,
        take: limit,
      });

      this.logger.log(`[FIND_ALL] Found ${tags.length} of ${total} tags (page ${page})`);

      return {
        data: tags,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }

    const tags = await this.tagRepository.find({
      order: { created_at: 'DESC' },
    });

    this.logger.log(`[FIND_ALL] Found ${tags.length} tags`);

    return tags;
  }

  async findOne(id: string): Promise<Tag> {
    this.logger.log(`[FIND_ONE] Fetching tag with id: ${id}`);
    const tag = await this.tagRepository.findOne({ where: { id } });
    
    if (!tag) {
      this.logger.warn(`[FIND_ONE] Tag not found: ${id}`);
      throw new NotFoundException(`Tag with id ${id} not found`);
    }
    
    this.logger.log(`[FIND_ONE] Found tag: ${id}`);
    return tag;
  }

  async create(tagData: Partial<Tag>): Promise<Tag> {
    this.logger.log(`[CREATE] Creating tag: ${tagData.name}`);
    const newTag = this.tagRepository.create(tagData);
    const savedTag = await this.tagRepository.save(newTag);
    this.logger.log(`[CREATE] Tag created with id: ${savedTag.id}`);
    return savedTag;
  }

  async update(id: string, updates: Partial<Tag>): Promise<Tag> {
    this.logger.log(`[UPDATE] Updating tag with id: ${id}`);
    
    const tag = await this.tagRepository.findOne({ where: { id } });

    if (!tag) {
      this.logger.warn(`[UPDATE] Tag not found: ${id}`);
      throw new NotFoundException(`Tag with id ${id} not found`);
    }

    Object.assign(tag, updates);
    const updated = await this.tagRepository.save(tag);
    
    this.logger.log(`[UPDATE] Tag updated: ${id}`);
    return updated;
  }

  async remove(id: string): Promise<void> {
    this.logger.log(`[DELETE] Deleting tag with id: ${id}`);
    
    const tag = await this.tagRepository.findOne({ where: { id } });

    if (!tag) {
      this.logger.warn(`[DELETE] Tag not found: ${id}`);
      throw new NotFoundException(`Tag with id ${id} not found`);
    }

    await this.tagRepository.remove(tag);
    this.logger.log(`[DELETE] Tag deleted: ${id}`);
  }
}
