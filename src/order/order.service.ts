import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Order, OrderDocument } from './schemas/order.schema';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { CreateOrderDto } from './dto/create-order.dto';
import mongoose from 'mongoose';
import { IUser } from 'src/users/users.interface';
import aqp from 'api-query-params';

@Injectable()
export class OrderService {
  constructor(
    @InjectModel(Order.name)
    private orderModel: SoftDeleteModel<OrderDocument>
  ) { }

  async create(createOrderDto: CreateOrderDto, user: IUser) {
    const newOrder = await this.orderModel.create({
      ...createOrderDto,
      createdBy: {
        _id: user._id,
        email: user.email,
      },
    });

    return {
      id: newOrder._id,
      createdAt: newOrder.createdAt,
    };
  }

  async findAll(currentPage: number, limit: number, qs: any) {
    const { filter, sort, projection, population } = aqp(qs);
    delete filter.current;
    delete filter.pageSize;

    const offset = (currentPage - 1) * limit;
    const totalItems = await this.orderModel.countDocuments(filter);
    const totalPages = Math.ceil(totalItems / limit);

    const result = await this.orderModel
      .find(filter, projection)
      .skip(offset)
      .limit(limit)
      .sort(sort as any)
      .populate('detail._id')
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
      throw new BadRequestException(`Invalid order id: ${id}`);
    }

    return this.orderModel.findById(id).populate('detail._id');
  }
}
