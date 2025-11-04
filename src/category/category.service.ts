import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { InjectModel } from '@nestjs/mongoose';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { IUser } from 'src/users/users.interface';
import mongoose from 'mongoose';
import { Category, CategoryDocument } from './schemas/category.schema';
import aqp from 'api-query-params';
import { CategoryNode } from './interfaces/category-node.interface'; // ✅ import interface riêng

@Injectable()
export class CategoryService {
  constructor(
    @InjectModel(Category.name)
    private categoryModel: SoftDeleteModel<CategoryDocument>,
  ) { }

  // ✅ Tạo mới danh mục (cha hoặc con)
  async create(createCategoryDto: CreateCategoryDto, user: IUser) {
    const { name, parentCategory } = createCategoryDto;

    // Kiểm tra trùng tên
    const isExist = await this.categoryModel.findOne({ name, isDeleted: false });
    if (isExist) {
      throw new BadRequestException(`Category with name "${name}" already exists`);
    }

    // Kiểm tra danh mục cha nếu có
    if (parentCategory) {
      const parent = await this.categoryModel.findById(parentCategory);
      if (!parent) throw new NotFoundException('Parent category not found');
    }

    const newCategory = await this.categoryModel.create({
      name,
      parentCategory: parentCategory || null,
      createdBy: {
        _id: user._id,
        email: user.email,
      },
    });

    return {
      id: newCategory._id,
      createdAt: newCategory.createdAt,
    };
  }

  // ✅ Lấy danh sách có phân trang
  async findAll(currentPage: number, limit: number, qs: string) {
    const { filter, sort, projection, population } = aqp(qs);
    delete filter.current;
    delete filter.pageSize;

    const offset = (+currentPage - 1) * (+limit);
    const defaultLimit = +limit || 10;

    const totalItems = await this.categoryModel.countDocuments(filter);
    const totalPages = Math.ceil(totalItems / defaultLimit);

    const result = await this.categoryModel
      .find(filter, projection)
      .skip(offset)
      .limit(defaultLimit)
      .sort(sort as any)
      .populate(population)
      .populate('parentCategory', 'name') // ✅ hiển thị tên danh mục cha
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

  // ✅ Lấy 1 danh mục cụ thể
  async findOne(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid category id: ${id}`);
    }

    return await this.categoryModel
      .findById(id)
      .populate('parentCategory', 'name');
  }

  // ✅ Cập nhật danh mục
  async update(id: string, updateCategoryDto: UpdateCategoryDto, user: IUser) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid category id: ${id}`);
    }

    // kiểm tra parentCategory hợp lệ
    if (updateCategoryDto.parentCategory) {
      const parent = await this.categoryModel.findById(updateCategoryDto.parentCategory);
      if (!parent) throw new NotFoundException('Parent category not found');
    }

    return await this.categoryModel.updateOne(
      { _id: id },
      {
        ...updateCategoryDto,
        updatedBy: {
          _id: user._id,
          email: user.email,
        },
      },
    );
  }

  // ✅ Xóa mềm danh mục
  async remove(id: string, user: IUser) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid category id: ${id}`);
    }

    await this.categoryModel.updateOne(
      { _id: id },
      {
        deletedBy: {
          _id: user._id,
          email: user.email,
        },
      },
    );

    return await this.categoryModel.softDelete({ _id: id });
  }

  // ✅ Lấy cây danh mục (cha + con)
  async getTree(): Promise<CategoryNode[]> {
    const categories = (await this.categoryModel
      .find({ isDeleted: false })
      .lean()) as CategoryNode[];

    const map = new Map(categories.map((c) => [c._id.toString(), c]));
    const roots: CategoryNode[] = [];

    for (const cat of categories) {
      if (cat.parentCategory) {
        const parent = map.get(cat.parentCategory.toString());
        if (parent) {
          if (!parent.children) parent.children = [];
          parent.children.push(cat);
        }
      } else {
        roots.push(cat);
      }
    }

    return roots;
  }
}
