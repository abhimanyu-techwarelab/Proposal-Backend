import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Query,
  Param,
  Body,
  Logger,
  ParseUUIDPipe,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from "@nestjs/swagger";
import { TemplatesService } from "./templates.service";
import { CreateTemplateDto } from "./dto/create-template.dto";
import { UpdateTemplateDto } from "./dto/update-template.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { RequirePermission } from "../auth/decorators/require-permission.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtPayload } from "../auth/interfaces/jwt-payload.interface";

@Controller("templates")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TemplatesController {
  private readonly logger = new Logger(TemplatesController.name);

  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  @RequirePermission("read_template")
  async findAll(@Query("page") page?: string, @Query("limit") limit?: string) {
    this.logger.log(
      `[REQUEST] GET /templates - page: ${page}, limit: ${limit}`
    );

    const startTime = Date.now();
    const pageNum = page ? parseInt(page, 10) : undefined;
    const limitNum = limit ? parseInt(limit, 10) : undefined;

    const result = await this.templatesService.findAll(pageNum, limitNum);

    if (Array.isArray(result)) {
      this.logger.log(
        `[RESPONSE] 200 OK - count: ${result.length} - ${
          Date.now() - startTime
        }ms`
      );
    } else {
      this.logger.log(
        `[RESPONSE] 200 OK - count: ${result.data.length}, total: ${
          result.total
        } - ${Date.now() - startTime}ms`
      );
    }

    return result;
  }

  @Post("create")
  @RequirePermission("create_template", "read_template")
  async create(
    @Body() dto: CreateTemplateDto,
    @CurrentUser() user: JwtPayload
  ) {
    this.logger.log(`[REQUEST] POST /templates/create`);

    const startTime = Date.now();
    // Set created_by from JWT token (user.user_id is extracted by JwtAuthGuard and CurrentUser decorator)
    dto.created_by = user.user_id;
    const result = await this.templatesService.create(dto);

    this.logger.log(
      `[RESPONSE] 201 Created - id: ${result.id} - ${Date.now() - startTime}ms`
    );

    return result;
  }

  @Get(":id")
  @RequirePermission("read_template")
  async findOne(@Param("id", ParseUUIDPipe) id: string) {
    this.logger.log(`[REQUEST] GET /templates/${id}`);

    const startTime = Date.now();
    const result = await this.templatesService.findOne(id);

    this.logger.log(
      `[RESPONSE] 200 OK - id: ${result.id} - ${Date.now() - startTime}ms`
    );

    return result;
  }

  @Put(":id")
  @RequirePermission("update_template", "read_template")
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateTemplateDto,
    @CurrentUser() user: JwtPayload
  ) {
    this.logger.log(`[REQUEST] PUT /templates/${id}`);

    const startTime = Date.now();

    // Set updated_by from JWT token (user_id from authenticated user)
    // The @CurrentUser() decorator extracts user from request.user, which is set by JwtAuthGuard
    // from the JWT token payload containing user_id
    dto.updated_by = user.user_id;

    const result = await this.templatesService.update(id, dto);

    this.logger.log(
      `[RESPONSE] 200 OK - id: ${result.id} - ${Date.now() - startTime}ms`
    );

    return result;
  }

  @Get(":id/tags")
  @RequirePermission("read_template")
  async getTemplateTags(@Param("id", ParseUUIDPipe) id: string) {
    this.logger.log(`[REQUEST] GET /templates/${id}/tags`);

    const startTime = Date.now();
    const result = await this.templatesService.getTemplateTags(id);

    this.logger.log(
      `[RESPONSE] 200 OK - count: ${result.length} - ${
        Date.now() - startTime
      }ms`
    );

    return result;
  }

  @Post("render")
  @RequirePermission("read_template")
  @ApiOperation({
    summary: "Render template HTML with data",
    description:
      "Renders a template HTML string with provided data using Handlebars.",
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        html: {
          type: "string",
          description: "Template HTML content with Handlebars placeholders",
          example: "<html><body><h1>{{project-title}}</h1></body></html>",
        },
        data: {
          type: "object",
          description: "Optional data object to populate template placeholders",
          example: { "project-title": "My Project" },
        },
      },
      required: ["html"],
    },
  })
  @ApiResponse({
    status: 200,
    description: "Template rendered successfully",
    schema: {
      type: "object",
      properties: {
        html: {
          type: "string",
          description: "Rendered HTML content",
        },
      },
    },
  })
  async render(@Body() body: { html: string; data?: Record<string, any> }) {
    this.logger.log(`[REQUEST] POST /templates/render`);

    const startTime = Date.now();
    const renderedHtml = this.templatesService.renderTemplate(
      body.html,
      body.data || {}
    );

    this.logger.log(
      `[RESPONSE] 200 OK - rendered ${renderedHtml.length} chars - ${
        Date.now() - startTime
      }ms`
    );

    return { html: renderedHtml };
  }

  @Delete(":id")
  @RequirePermission("delete_template", "read_template")
  async delete(@Param("id", ParseUUIDPipe) id: string) {
    this.logger.log(`[REQUEST] DELETE /templates/${id}`);

    const startTime = Date.now();
    const result = await this.templatesService.softDelete(id);

    this.logger.log(
      `[RESPONSE] 200 OK - id: ${result.id} - ${Date.now() - startTime}ms`
    );

    return result;
  }
}
