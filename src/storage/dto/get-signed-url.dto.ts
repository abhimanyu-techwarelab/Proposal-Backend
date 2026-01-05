import { IsString, IsOptional, IsNumber, IsArray, Min, ArrayMinSize } from 'class-validator';

export class GetSignedUrlDto {
  @IsString()
  storagePath: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  expiresIn?: number;
}

export class GetSignedUrlsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  storagePaths: string[];

  @IsOptional()
  @IsNumber()
  @Min(1)
  expiresIn?: number;
}
