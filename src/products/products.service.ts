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
    private categoryModel: mongoose.Model<Category>,
  ) { }

  async create(createProductDto: CreateProductDto, user: IUser) {
    const { name, thumbnail, slider, mainText, desc, category, variants } =
      createProductDto;

    const categoryExist = await this.categoryModel.findById(category);
    if (!categoryExist) {
      throw new BadRequestException('Category không tồn tại');
    }

    // ✅ Tính tổng số lượng và giá trung bình từ các biến thể
    const totalQuantity = variants.reduce(
      (sum, v) =>
        sum +
        v.colors.reduce((subSum, c) => subSum + Number(c.quantity), 0),
      0,
    );
    const avgPrice =
      variants.length > 0
        ? variants
          .flatMap((v) => v.colors)
          .reduce((sum, c) => sum + Number(c.price), 0) /
        variants.flatMap((v) => v.colors).length
        : 0;

    const newProduct = await this.productModel.create({
      name,
      thumbnail,
      slider,
      mainText,
      desc,
      price: avgPrice,
      quantity: totalQuantity,
      category: categoryExist._id,
      variants,
      createdBy: { _id: user._id, email: user.email },
    });

    return { id: newProduct._id, createdAt: newProduct.createdAt };
  }

  async findAll(currentPage: number, limit: number, qs: string) {
    const { filter, sort, projection } = aqp(qs);
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
      .exec();

    return {
      meta: { current: currentPage, pageSize: limit, pages: totalPages, total: totalItems },
      result,
    };
  }

  async findOne(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid product id: ${id}`);
    }

    return await this.productModel
      .findById(id)
      .populate('category', 'name')
      .exec();
  }

  async update(id: string, updateProductDto: UpdateProductDto, user: IUser) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid product id: ${id}`);
    }

    const { variants } = updateProductDto;

    let totalQuantity = 0;
    let avgPrice = 0;
    if (variants && variants.length > 0) {
      totalQuantity = variants.reduce(
        (sum, v) =>
          sum + v.colors.reduce((subSum, c) => subSum + Number(c.quantity), 0),
        0,
      );
      avgPrice =
        variants
          .flatMap((v) => v.colors)
          .reduce((sum, c) => sum + Number(c.price), 0) /
        variants.flatMap((v) => v.colors).length;
    }

    await this.productModel.updateOne(
      { _id: id },
      {
        ...updateProductDto,
        price: avgPrice,
        quantity: totalQuantity,
        updatedBy: { _id: user._id, email: user.email },
      },
    );

    return { updated: true };
  }

  async remove(id: string, user: IUser) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid product id: ${id}`);
    }

    await this.productModel.updateOne(
      { _id: id },
      { deletedBy: { _id: user._id, email: user.email } },
    );

    return await this.productModel.softDelete({ _id: id });
  }
}
