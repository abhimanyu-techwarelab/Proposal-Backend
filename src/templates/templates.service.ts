import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import Handlebars from "handlebars";
import { marked } from "marked";
import puppeteer from "puppeteer";
import { Template } from "./entities/template.entity";
import { TemplateTag } from "./entities/template-tag.entity";
import { Tag } from "../tags/entities/tag.entity";
import { CreateTemplateDto } from "./dto/create-template.dto";
import { UpdateTemplateDto } from "./dto/update-template.dto";
import { StorageService } from "../storage/storage.service";

interface MergedProposalData {
  title?: string;
  date_of_proposal?: string;
  submitted_to?: string;
  "executive-summary"?: string;
  objectives?: string;
  "scope-of-work-introduction"?: string;
  "scope-of-work-summary"?: string;
  "scope-of-work"?: string;
  end_date?: string;
  "training-and-support"?: string;
  start_date?: string;
  "duration-business-days"?: string;
  "team-structure-min-experiance"?: string;
  "team-structure-table"?: Array<{
    Designation: string;
    Count: string;
    "Key Responsibilities": string;
    Experience: string;
  }>;
  "implementation-timeline-table"?: Array<{
    phase: string;
    scope: string;
    timeline: string;
  }>;
  [key: string]: any;
}

@Injectable()
export class TemplatesService {
  private readonly logger = new Logger(TemplatesService.name);

  constructor(
    @InjectRepository(Template)
    private templateRepository: Repository<Template>,
    @InjectRepository(TemplateTag)
    private templateTagRepository: Repository<TemplateTag>,
    @InjectRepository(Tag)
    private tagRepository: Repository<Tag>,
    private storageService: StorageService
  ) {
    this.registerHandlebarsHelpers();
    this.logger.log(`[INIT] TemplatesService initialized with TypeORM`);
  }

  private registerHandlebarsHelpers(): void {
    Handlebars.registerHelper("markdown", (text: string) => {
      if (!text) return "";
      return new Handlebars.SafeString(marked.parse(text) as string);
    });

    Handlebars.registerHelper(
      "table",
      (rows: any[], options: Handlebars.HelperOptions) => {
        if (!rows || !Array.isArray(rows) || rows.length === 0) {
          return "";
        }

        const headers = Object.keys(rows[0]);
        let html = '<table class="proposal-table"><thead><tr>';

        headers.forEach((header) => {
          html += `<th>${header}</th>`;
        });

        html += "</tr></thead><tbody>";

        rows.forEach((row) => {
          html += "<tr>";
          headers.forEach((header) => {
            html += `<td>${row[header] || ""}</td>`;
          });
          html += "</tr>";
        });

        html += "</tbody></table>";
        return new Handlebars.SafeString(html);
      }
    );

    Handlebars.registerHelper("preserveLineBreaks", (text: string) => {
      if (!text) return "";
      const escaped = Handlebars.Utils.escapeExpression(text);
      const formatted = escaped
        .replace(/\n\n/g, "</p><p>")
        .replace(/\n/g, "<br>");
      return new Handlebars.SafeString(`<p>${formatted}</p>`);
    });
  }

  async fetchTemplate(
    templateId: string
  ): Promise<{ id: string; html: string; name: string }> {
    this.logger.log(`Fetching template: ${templateId}`);

    const template = await this.templateRepository.findOne({
      where: { id: templateId },
    });

    if (!template) {
      this.logger.error(
        `Failed to fetch template ${templateId}: Template not found`
      );
      throw new Error(`Failed to fetch template: Template not found`);
    }

    this.logger.log(`Template fetched: ${template.name}`);
    return {
      id: template.id,
      html: template.html || "",
      name: template.name,
    };
  }

  renderTemplate(
    templateDesign: string,
    data: MergedProposalData | Record<string, any> = {}
  ): string {
    this.logger.log("Rendering template with data...");

    // If data is MergedProposalData, map it to template format
    const mappedData =
      "title" in data || "date_of_proposal" in data
        ? {
            "project-title": data.title,
            "date-of-proposal": data.date_of_proposal,
            "submitted-to": data.submitted_to,
            "executive-summary": data["executive-summary"],
            objectives: data.objectives,
            "scope-of-work-introduction": data["scope-of-work-introduction"],
            "scope-of-work-summary": data["scope-of-work-summary"],
            "scope-of-work": data["scope-of-work"],
            "estimated-go-live": data.end_date,
            "training-and-support": data["training-and-support"],
            "estimated-project-start-date": data.start_date,
            "duration-business-days": data["duration-business-days"],
            "team-structure-min-experiance":
              data["team-structure-min-experiance"],
            "team-structure-table": data["team-structure-table"],
            "implementation-timeline-table":
              data["implementation-timeline-table"],
            ...data,
          }
        : data;

    try {
      const template = Handlebars.compile(templateDesign);
      const renderedHtml = template(mappedData);
      this.logger.log(
        `Template rendered, length: ${renderedHtml.length} characters`
      );
      return renderedHtml;
    } catch (error: any) {
      this.logger.error(`Failed to render template: ${error.message}`);
      throw new Error(`Failed to render template: ${error.message}`);
    }
  }

  async findAll(
    page?: number,
    limit?: number
  ): Promise<
    | Template[]
    | {
        data: Template[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }
  > {
    this.logger.log(
      `[FIND_ALL] Fetching templates - page: ${page}, limit: ${limit}`
    );

    if (page !== undefined && limit !== undefined) {
      const skip = (page - 1) * limit;

      const [templates, total] = await this.templateRepository.findAndCount({
        where: { is_deleted: false },
        select: [
          "id",
          "name",
          "description",
          "preview_image",
          "is_deleted",
          "created_by",
          "created_at",
          "updated_at",
        ],
        order: { created_at: "DESC" },
        skip,
        take: limit,
      });

      this.logger.log(
        `[FIND_ALL] Found ${templates.length} of ${total} templates (page ${page})`
      );

      return {
        data: templates,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }

    const templates = await this.templateRepository.find({
      where: { is_deleted: false },
      select: [
        "id",
        "name",
        "description",
        "preview_image",
        "is_deleted",
        "created_by",
        "created_at",
        "updated_at",
      ],
      order: { created_at: "DESC" },
    });

    this.logger.log(`[FIND_ALL] Found ${templates.length} templates`);

    return templates;
  }

  async findOne(id: string): Promise<Template> {
    this.logger.log(`[FIND_ONE] Fetching template: ${id}`);

    const template = await this.templateRepository.findOne({
      where: { id, is_deleted: false },
      select: [
        "id",
        "name",
        "description",
        "html",
        "preview_image",
        "is_deleted",
        "created_by",
        "created_at",
        "updated_at",
      ],
    });

    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }

    this.logger.log(`[FIND_ONE] Found template: ${id}`);

    return template;
  }

  private async convertHtmlToImage(html: string): Promise<Buffer> {
    this.logger.log(`[HTML_TO_IMAGE] Converting HTML to image...`);

    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });

      const page = await browser.newPage();

      // Set viewport to A4 size (210mm x 297mm at 96 DPI)
      await page.setViewport({
        width: 794, // 210mm at 96 DPI
        height: 1123, // 297mm at 96 DPI
        deviceScaleFactor: 2, // Higher quality
      });

      // Set content with HTML
      await page.setContent(html, {
        waitUntil: "networkidle0",
      });

      // Wait a bit for any animations or dynamic content
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Extract first page - find first .page element or take screenshot of viewport
      const firstPageElement = await page.$(".page");

      let screenshot: Buffer;
      if (firstPageElement) {
        // Screenshot only the first page element
        screenshot = (await firstPageElement.screenshot({
          type: "jpeg",
          quality: 90,
        })) as Buffer;
      } else {
        // If no .page element, screenshot the viewport (first page)
        screenshot = (await page.screenshot({
          type: "jpeg",
          quality: 90,
          fullPage: false,
        })) as Buffer;
      }

      this.logger.log(
        `[HTML_TO_IMAGE] Image converted successfully, size: ${screenshot.length} bytes`
      );
      return screenshot;
    } catch (error: any) {
      this.logger.error(
        `[HTML_TO_IMAGE] Failed to convert HTML to image: ${error.message}`
      );
      throw new Error(`Failed to convert HTML to image: ${error.message}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  async create(dto: CreateTemplateDto): Promise<Template> {
    this.logger.log(`[CREATE] Creating template: ${dto.name}`);

    try {
      // Create template entity
      const template = this.templateRepository.create({
        name: dto.name,
        description: dto.description,
        html: dto.html,
        created_by: dto.created_by,
        is_deleted: false,
      });

      // Save template to get the ID
      const savedTemplate = await this.templateRepository.save(template);
      this.logger.log(`[CREATE] Template saved with ID: ${savedTemplate.id}`);

      // Create template_tags relationships if tags are provided
      if (dto.tags && dto.tags.length > 0) {
        this.logger.log(
          `[CREATE] Creating ${dto.tags.length} tag associations`
        );
        const templateTags = dto.tags.map((tagId) =>
          this.templateTagRepository.create({
            template_id: savedTemplate.id,
            tag_id: tagId,
          })
        );
        await this.templateTagRepository.save(templateTags);
        this.logger.log(`[CREATE] Tag associations created successfully`);
      }

      // Convert HTML to image and upload to Supabase
      try {
        this.logger.log(`[CREATE] Converting HTML to image...`);
        const imageBuffer = await this.convertHtmlToImage(dto.html);

        const bucket = "template_display_image";
        const filePath = `${savedTemplate.id}/image.jpeg`;

        this.logger.log(
          `[CREATE] Uploading image to Supabase: ${bucket}/${filePath}`
        );
        const storagePath = await this.storageService.uploadFile(
          bucket,
          filePath,
          imageBuffer,
          "image/jpeg"
        );

        // Update template with preview_image path
        savedTemplate.preview_image = storagePath;
        const updatedTemplate = await this.templateRepository.save(
          savedTemplate
        );

        this.logger.log(
          `[CREATE] Template created successfully with preview image: ${savedTemplate.id}`
        );
        return updatedTemplate;
      } catch (imageError: any) {
        // If image conversion/upload fails, log warning but still return the template
        this.logger.warn(
          `[CREATE] Failed to generate preview image: ${imageError.message}. Template created without preview image.`
        );
        return savedTemplate;
      }
    } catch (error: any) {
      this.logger.error(`[CREATE] Failed to create template: ${error.message}`);
      throw error;
    }
  }

  async update(id: string, dto: UpdateTemplateDto): Promise<Template> {
    this.logger.log(`[UPDATE] Updating template: ${id}`);

    // Find existing template by ID
    const template = await this.templateRepository.findOne({
      where: { id, is_deleted: false },
    });

    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }

    // Store old preview_image URL for potential deletion
    const oldPreviewImageUrl = template.preview_image;

    // Check if HTML changed
    const htmlChanged = dto.html && dto.html !== template.html;

    // If HTML changed, regenerate preview image
    if (htmlChanged && dto.html) {
      try {
        this.logger.log(`[UPDATE] HTML changed, regenerating preview image...`);

        // Delete old image from storage if it exists
        if (oldPreviewImageUrl) {
          try {
            await this.storageService.deleteFile(oldPreviewImageUrl);
            this.logger.log(`[UPDATE] Old preview image deleted`);
          } catch (deleteError: any) {
            this.logger.warn(
              `[UPDATE] Failed to delete old preview image: ${deleteError.message}. Continuing with update.`
            );
          }
        }

        // Generate new image
        this.logger.log(`[UPDATE] Converting HTML to image...`);
        const imageBuffer = await this.convertHtmlToImage(dto.html);

        const bucket = "template_display_image";
        const filePath = `${id}/image.jpeg`;

        this.logger.log(
          `[UPDATE] Uploading new image to Supabase: ${bucket}/${filePath}`
        );
        const storagePath = await this.storageService.uploadFile(
          bucket,
          filePath,
          imageBuffer,
          "image/jpeg"
        );

        // Update preview_image with new URL
        template.preview_image = storagePath;
        this.logger.log(`[UPDATE] Preview image updated successfully`);
      } catch (imageError: any) {
        // If image generation/upload fails, log warning but continue with update
        this.logger.warn(
          `[UPDATE] Failed to regenerate preview image: ${imageError.message}. Template will be updated without new preview image.`
        );
      }
    }

    // Update other fields (excluding tags)
    if (dto.name !== undefined) {
      template.name = dto.name;
    }
    if (dto.description !== undefined) {
      template.description = dto.description;
    }
    if (dto.html !== undefined) {
      template.html = dto.html;
    }
    if (dto.updated_by !== undefined) {
      template.updated_by = dto.updated_by;
    }

    // Update template_tags relationships if tags are provided
    if (dto.tags !== undefined) {
      this.logger.log(
        `[UPDATE] Updating template tags: ${dto.tags.length} tags`
      );

      // Delete all existing template_tags for this template
      await this.templateTagRepository.delete({ template_id: id });
      this.logger.log(`[UPDATE] Deleted existing template_tags`);

      // Create new template_tags entries
      if (dto.tags.length > 0) {
        const templateTags = dto.tags.map((tagId) =>
          this.templateTagRepository.create({
            template_id: id,
            tag_id: tagId,
          })
        );

        await this.templateTagRepository.save(templateTags);
        this.logger.log(
          `[UPDATE] Created ${templateTags.length} new template_tags`
        );
      }
    }

    // Save and return updated template
    const updatedTemplate = await this.templateRepository.save(template);
    this.logger.log(`[UPDATE] Template updated successfully: ${id}`);

    return updatedTemplate;
  }

  async getTemplateTags(templateId: string): Promise<Tag[]> {
    this.logger.log(`[GET_TAGS] Fetching tags for template: ${templateId}`);

    try {
      // Find all template_tags for this template
      const templateTags = await this.templateTagRepository.find({
        where: { template_id: templateId },
      });

      this.logger.log(
        `[GET_TAGS] Found ${templateTags.length} template_tag records`
      );

      if (templateTags.length === 0) {
        this.logger.log(`[GET_TAGS] No tags found for template: ${templateId}`);
        return [];
      }

      // Extract tag IDs
      const tagIds = templateTags
        .map((tt) => tt.tag_id)
        .filter((id): id is string => Boolean(id) && typeof id === "string");

      if (tagIds.length === 0) {
        this.logger.log(
          `[GET_TAGS] No valid tag IDs found for template: ${templateId}`
        );
        return [];
      }

      this.logger.log(
        `[GET_TAGS] Fetching ${tagIds.length} tag details: ${tagIds.join(", ")}`
      );

      // Fetch tag details using In operator for better performance
      const tags = await this.tagRepository.find({
        where: { id: In(tagIds) },
      });

      this.logger.log(
        `[GET_TAGS] Found ${tags.length} tags for template: ${templateId}`
      );
      return tags;
    } catch (error: any) {
      this.logger.error(
        `[GET_TAGS] Error fetching tags for template ${templateId}:`,
        error?.message || error
      );
      this.logger.error(
        `[GET_TAGS] Error details:`,
        JSON.stringify(error, null, 2)
      );
      if (error?.stack) {
        this.logger.error(`[GET_TAGS] Stack trace:`, error.stack);
      }
      throw error;
    }
  }

  async softDelete(id: string): Promise<Template> {
    this.logger.log(`[SOFT_DELETE] Soft deleting template: ${id}`);

    const template = await this.templateRepository.findOne({
      where: { id, is_deleted: false },
    });

    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }

    template.is_deleted = true;
    const deletedTemplate = await this.templateRepository.save(template);

    this.logger.log(`[SOFT_DELETE] Template soft deleted: ${id}`);

    return deletedTemplate;
  }
}
