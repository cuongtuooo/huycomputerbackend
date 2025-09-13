import { IsArray, IsMongoId, IsNotEmpty, IsNumber, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class OrderDetailDto {
    @IsMongoId({ message: '_id phải là ObjectId của Book' })
    _id: string;

    @IsNotEmpty({ message: 'Số lượng không được để trống' })
    @IsNumber({}, { message: 'quantity phải là số' })
    quantity: number;

    @IsNotEmpty({ message: 'productName không được để trống' })
    @IsString()
    productName: string;
}

export class CreateOrderDto {
    @IsNotEmpty()
    name: string;

    @IsNotEmpty()
    address: string;

    @IsNotEmpty()
    phone: string;

    @IsNotEmpty()
    type: string; // COD, banking,...

    paymentStatus?: string;

    paymentRef?: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => OrderDetailDto)
    detail: OrderDetailDto[];

    @IsNotEmpty()
    @IsNumber()
    totalPrice: number;
}
