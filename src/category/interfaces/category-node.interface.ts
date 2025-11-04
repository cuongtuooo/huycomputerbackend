import { Category } from '../schemas/category.schema';

export interface CategoryNode extends Category {
    _id: any;
    children?: CategoryNode[];
}
