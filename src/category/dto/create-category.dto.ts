import { IsNotEmpty } from "class-validator";

export class CreateCategoryDto {
    @IsNotEmpty({
        message: "name không được để trống"
    })
    name: string;
}
