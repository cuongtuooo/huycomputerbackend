import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, Types } from 'mongoose';
import { Product } from 'src/products/schemas/products.schemas';

export type OrderDocument = HydratedDocument<Order>;
export type OrderStatus = 'PENDING' | 'SHIPPING' | 'DELIVERED' | 'RECEIVED' | 'CANCELED';

@Schema({ timestamps: true }) // tự sinh createdAt + updatedAt
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
        enum: ['PENDING', 'SHIPPING', 'DELIVERED', 'RECEIVED', 'CANCELED'],
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

    /** ✅ Bổ sung để TypeScript biết có 2 field này */
    @Prop() createdAt: Date;
    @Prop() updatedAt: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
