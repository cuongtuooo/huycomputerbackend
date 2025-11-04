import {
    IsArray,
    IsMongoId,
    IsNotEmpty,
    IsOptional,
    IsString,
    ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class ColorDto {
    @IsNotEmpty()
    @IsString()
    color: string;

    @IsNotEmpty()
    price: number;

    @IsNotEmpty()
    quantity: number;
}

class VariantDto {
    @IsNotEmpty()
    @IsString()
    versionName: string;

    @ValidateNested({ each: true })
    @Type(() => ColorDto)
    @IsArray()
    colors: ColorDto[];
}

export class CreateProductDto {
    @IsNotEmpty()
    name: string;

    @IsNotEmpty()
    thumbnail: string;

    @IsArray()
    slider: string[];

    @IsNotEmpty()
    mainText: string;

    @IsNotEmpty()
    desc: string;

    @IsOptional()
    price?: number;

    @IsOptional()
    quantity?: number;

    @IsMongoId()
    category: string;

    @ValidateNested({ each: true })
    @Type(() => VariantDto)
    @IsArray()
    variants: VariantDto[];
}
