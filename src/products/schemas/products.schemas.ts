import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type ProductDocument = HydratedDocument<Product>;

@Schema({ timestamps: true })
export class Product {
    @Prop()
    name: string;

    @Prop()
    thumbnail: string;

    @Prop()
    slider: string[];

    @Prop()
    mainText: string;

    @Prop()
    desc: string;

    // ✅ Tổng giá & tồn kho chỉ để tham khảo
    @Prop()
    price: number;

    @Prop()
    sold: number;

    @Prop()
    quantity: number;

    // ✅ Liên kết danh mục
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Category' })
    category: mongoose.Schema.Types.ObjectId;

    // ✅ Phiên bản có nhiều màu sắc
    @Prop({
        type: [
            {
                versionName: { type: String, required: true },
                colors: [
                    {
                        color: { type: String, required: true },
                        price: { type: Number, required: true },
                        quantity: { type: Number, required: true },
                    },
                ],
            },
        ],
        default: [],
    })
    variants: {
        versionName: string;
        colors: { color: string; price: number; quantity: number }[];
    }[];

    @Prop({ type: Object })
    createdBy: {
        _id: mongoose.Schema.Types.ObjectId;
        email: string;
    };

    @Prop({ type: Object })
    updatedBy: {
        _id: mongoose.Schema.Types.ObjectId;
        email: string;
    };

    @Prop({ type: Object })
    deletedBy: {
        _id: mongoose.Schema.Types.ObjectId;
        email: string;
    };

    @Prop({ default: false })
    isDeleted: boolean;

    @Prop()
    createdAt: Date;

    @Prop()
    updatedAt: Date;

    @Prop()
    deletedAt: Date;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
