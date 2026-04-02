import { IsString, IsOptional, IsBoolean, IsArray, ValidateNested, IsNumber, Min, IsUrl } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateVariantDto {
  @IsString()
  sku: string;

  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsNumber()
  @Min(0)
  stock: number;
}

export class CreateImageDto {
  @IsUrl()
  url: string;
}

export class CreateProductDto {
  @IsString()
  name: string;

  @IsString()
  categoryId: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateImageDto)
  images?: CreateImageDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVariantDto)
  variants: CreateVariantDto[];
}