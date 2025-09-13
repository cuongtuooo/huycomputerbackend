import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectModel } from '@nestjs/mongoose';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { IUser } from 'src/users/users.interface';
import mongoose from 'mongoose';
import aqp from 'api-query-params';
import { Category } from 'src/category/schemas/category.schema';
import { Product, ProductDocument } from './schemas/products.schemas';

@Injectable()
export class ProductService {
  constructor(
    @InjectModel(Product.name)
    private productModel: SoftDeleteModel<ProductDocument>,

    @InjectModel(Category.name)
    private categoryModel: mongoose.Model<Category>
  ) { }

  async create(createProductDto: CreateProductDto, user: IUser) {
    const {
      name,
      thumbnail,
      slider,
      mainText,
      desc,
      price,
      sold,
      quantity,
      category,
    } = createProductDto;

    const categoryExist = await this.categoryModel.findById(category);
    if (!categoryExist) {
      throw new BadRequestException('Category không tồn tại');
    }

    const newProduct = await this.productModel.create({
      name,
      thumbnail,
      slider,
      mainText,
      desc,
      price: +price,
      sold: +sold || 0,
      quantity: +quantity,
      category: {
        _id: categoryExist._id,
        name: categoryExist.name,
      },
      createdBy: {
        _id: user._id,
        email: user.email,
      },
    });

    return {
      createdAt: newProduct?.createdAt,
      id: newProduct?._id,
    };
  }

  async findAll(currentPage: number, limit: number, qs: string) {
    const { filter, sort, projection, population } = aqp(qs);

    delete filter.current;
    delete filter.pageSize;

    const offset = (+currentPage - 1) * (+limit);
    const defaultLimit = +limit || 10;

    const totalItems = await this.productModel.countDocuments(filter);
    const totalPages = Math.ceil(totalItems / defaultLimit);

    const result = await this.productModel
      .find(filter, projection)
      .skip(offset)
      .limit(defaultLimit)
      .sort(sort as any)
      .populate('category', 'name')
      .select(projection as any) //bổ sung dùng ref
      .exec();

    return {
      meta: {
        current: currentPage,
        pageSize: limit,
        pages: totalPages,
        total: totalItems,
      },
      result,
    };
  }

  async findOne(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid product id: ${id}`);
    }

    return await this.productModel.findOne({ _id: id })
    .populate([{
      path: "category",
      select: { name: 1 }
    }]);
  }

  async update(id: string, updateProductDto: UpdateProductDto, user: IUser) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid product id: ${id}`);
    }

    return await this.productModel.updateOne(
      { _id: id },
      {
        ...updateProductDto,
        updatedBy: {
          _id: user._id,
          email: user.email,
        },
      },
    );
  }

  async remove(id: string, user: IUser) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid product id: ${id}`);
    }

    await this.productModel.updateOne(
      { _id: id },
      {
        deletedBy: {
          _id: user._id,
          email: user.email,
        },
      },
    );

    return await this.productModel.softDelete({ _id: id });
  }
}
