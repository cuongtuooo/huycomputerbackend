import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, Types } from 'mongoose';
import { Product } from 'src/products/schemas/products.schemas';

export type OrderDocument = HydratedDocument<Order>;
export type OrderStatus =
    | 'PENDING'
    | 'SHIPPING'
    | 'DELIVERED'
    | 'RECEIVED'
    | 'CANCELED'
    | 'RETURN_REQUESTED'  // 👈 thêm: Khách yêu cầu hoàn hàng
    | 'RETURNED'          // Admin đã chấp nhận hoàn hàng
    | 'RETURN_RECEIVED'   // Admin xác nhận đã nhận hàng hoàn
    | 'RETURN_REJECTED';  // 👈 thêm: Admin từ chối hoàn hàng


@Schema({ timestamps: true })
export class Order {
    @Prop() name: string;
    @Prop() address: string;
    @Prop() phone: string;
    @Prop() type: string;

    @Prop() paymentStatus: string;
    @Prop() paymentRef: string;

    @Prop({
        type: [
            {
                _id: { type: mongoose.Schema.Types.ObjectId, ref: Product.name, required: true },
                quantity: { type: Number, required: true },
                productName: { type: String, required: true },
            },
        ],
    })
    detail: { _id: Types.ObjectId; quantity: number; productName: string }[];

    @Prop() totalPrice: number;

    @Prop({
        enum: [
            'PENDING',
            'SHIPPING',
            'DELIVERED',
            'RECEIVED',
            'CANCELED',
            'RETURN_REQUESTED', // ✅ khách yêu cầu hoàn hàng
            'RETURNED',         // ✅ admin chấp nhận hoàn hàng
            'RETURN_RECEIVED',  // ✅ admin xác nhận đã nhận hàng hoàn
            'RETURN_REJECTED',  // ✅ admin từ chối hoàn hàng
        ],
        default: 'PENDING',
    })
    status: OrderStatus;

    @Prop({
        type: {
            _id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            email: { type: String },
        },
    })
    createdBy: { _id: Types.ObjectId; email: string };

    @Prop({
        type: {
            _id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            email: { type: String },
        },
    })
    updatedBy: { _id: Types.ObjectId; email: string };

    @Prop({
        type: {
            _id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            email: { type: String },
        },
    })
    deletedBy: { _id: Types.ObjectId; email: string };

    @Prop({ default: false }) isDeleted: boolean;
    @Prop() deletedAt: Date;

    @Prop() createdAt: Date;
    @Prop() updatedAt: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
