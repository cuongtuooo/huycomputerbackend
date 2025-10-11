import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Order, OrderDocument } from './schemas/order.schema';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { CreateOrderDto } from './dto/create-order.dto';
import mongoose, { isValidObjectId, Types, SortOrder, PopulateOptions } from 'mongoose';
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
      status: 'PENDING', // có/không tuỳ bạn, khuyên có
      createdBy: {
        _id: new Types.ObjectId(user._id),   // 👈 ép về ObjectId
        email: user.email,
      },
    });

    return { id: newOrder._id, createdAt: newOrder.createdAt };
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

  private async mustOwnOrder(id: string, user: any) {
    if (!isValidObjectId(id)) throw new BadRequestException('Invalid order id');
    const doc = await this.orderModel.findById(id);
    if (!doc) throw new BadRequestException('Order not found');
    if (String(doc?.createdBy?._id) !== String(user?._id)) {
      throw new ForbiddenException('Not your order');
    }
    return doc;
  }

  async cancelMyOrder(id: string, user: any) {
    const order = await this.mustOwnOrder(id, user);
    if (['SHIPPING', 'DELIVERED', 'RECEIVED'].includes(order.status)) {
      throw new BadRequestException('Order cannot be canceled at this stage');
    }
    order.status = 'CANCELED';
    order.updatedBy = { _id: new Types.ObjectId(user._id), email: user.email };
    await order.save();
    return order;
  }

  // Admin cập nhật sang SHIPPING/DELIVERED (dùng endpoint updateStatus hiện có hoặc thêm method riêng)
  async adminUpdateStatus(id: string, status: 'SHIPPING' | 'DELIVERED', admin: any) {
    if (!isValidObjectId(id)) throw new BadRequestException('Invalid order id');
    const order = await this.orderModel.findById(id);
    if (!order) throw new BadRequestException('Order not found');

    order.status = status;
    order.updatedBy = { _id: new Types.ObjectId(admin._id), email: admin.email };
    await order.save();
    return order;
  }

  // Khách xác nhận đã nhận
  async confirmReceived(id: string, user: any) {
    const order = await this.mustOwnOrder(id, user);
    if (order.status !== 'DELIVERED') {
      throw new BadRequestException('Order is not delivered yet');
    }
    order.status = 'RECEIVED';
    order.updatedBy = { _id: new Types.ObjectId(user._id), email: user.email };
    await order.save();

    // Ghi vào lịch sử mua hàng tại đây (nếu bạn đã có HistoryService)
    // await this.historyService.createFromOrder(order, user);

    return order;
  }

}
