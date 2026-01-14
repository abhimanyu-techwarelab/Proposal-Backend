import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsArray,
  IsOptional,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateTemplateDto {
  @ApiProperty({
    description: "Template name",
    example: "My Template",
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: "Template description",
    example: "A description of the template",
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: "Template HTML content",
    example: "<html>...</html>",
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  html: string;

  @ApiPropertyOptional({
    description:
      "User ID who created the template (set automatically from JWT)",
    example: "123e4567-e89b-12d3-a456-426614174000",
    type: String,
  })
  @IsUUID()
  @IsOptional()
  created_by?: string;

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
}
