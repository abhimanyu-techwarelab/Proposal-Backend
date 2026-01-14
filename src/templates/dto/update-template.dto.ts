import {
  IsString,
  IsOptional,
  IsUUID,
  IsArray,
  IsNotEmpty,
} from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateTemplateDto {
  @ApiPropertyOptional({
    description: "Template name",
    example: "My Template",
    type: String,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: "Template description",
    example: "A description of the template",
    type: String,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: "Template HTML content",
    example: "<html>...</html>",
    type: String,
  })
  @IsString()
  @IsOptional()
  html?: string;

  @ApiPropertyOptional({
    description: "Array of tag IDs to associate with the template",
    example: [
      "123e4567-e89b-12d3-a456-426614174000",
      "223e4567-e89b-12d3-a456-426614174001",
    ],
    type: [String],
  })
  @IsArray()
  @IsUUID("4", { each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({
    description:
      "User ID who updated the template (set automatically from JWT token)",
    example: "123e4567-e89b-12d3-a456-426614174000",
    type: String,
  })
  @IsUUID()
  @IsOptional()
  updated_by?: string;
}
