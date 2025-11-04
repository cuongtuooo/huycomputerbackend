import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type CategoryDocument = HydratedDocument<Category>;

@Schema({ timestamps: true })
export class Category {
    @Prop({ required: true })
    name: string;

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null })
    parentCategory: mongoose.Schema.Types.ObjectId | null;

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

    @Prop()
    createdAt: Date;

    @Prop()
    updatedAt: Date;

    @Prop()
    deletedAt: Date;

    @Prop({ default: false })
    isDeleted: boolean;
}

export const CategorySchema = SchemaFactory.createForClass(Category);

// ✅ để có thể populate danh mục con
CategorySchema.virtual('children', {
    ref: 'Category',
    localField: '_id',
    foreignField: 'parentCategory',
});
