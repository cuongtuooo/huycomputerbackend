import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { Order, OrderDocument } from './schemas/order.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { IUser } from 'src/users/users.interface';
import mongoose, { Types } from 'mongoose';
import aqp from 'api-query-params';

@Injectable()
export class OrderService {
  constructor(
    @InjectModel(Order.name)
    private orderModel: SoftDeleteModel<OrderDocument>
  ) { }

  /** ================================
   *  🟢 USER CREATE ORDER
   *  ================================= */
  async create(createOrderDto: CreateOrderDto, user: IUser) {
    const newOrder = await this.orderModel.create({
      ...createOrderDto,
      status: 'PENDING',
      createdBy: {
        _id: new Types.ObjectId(user._id),
        email: user.email,
      },
    });

    return {
      id: newOrder._id,
      createdAt: newOrder.createdAt,
    };
  }

  /** ================================
   *  🟡 GET ALL ORDERS
   *  ADMIN → xem tất cả
   *  USER  → chỉ xem của mình
   *  ================================= */
  // 🔥 API CLIENT chỉ lấy order của user đăng nhập
  async findAll(current: number, pageSize: number, qs: any, user: IUser) {
    const parsed = aqp(qs);
    const { filter, sort, projection } = parsed;

    delete filter.current;
    delete filter.pageSize;

    // 🚨 Luôn chỉ lấy đơn của chính mình → không check role nữa
    filter['createdBy._id'] = new Types.ObjectId(user._id);

    const offset = (current - 1) * pageSize;

    const totalItems = await this.orderModel.countDocuments(filter);
    const result = await this.orderModel
      .find(filter, projection)
      .skip(offset)
      .limit(pageSize)
      .sort(sort as any)
      .populate('detail._id')
      .lean();

    return {
      meta: {
        current,
        pageSize,
        total: totalItems,
        pages: Math.ceil(totalItems / pageSize),
      },
      result
    };
  }


  /** ================================
   *  🔵 GET ONE ORDER (with permission)
   *  ADMIN → xem tất cả
   *  USER → chỉ xem đơn của mình
   *  ================================= */
  async findOne(id: string, user: IUser) {
    const order = await this.orderModel
      .findById(id)
      .populate('detail._id')
      .lean();

    if (!order) throw new BadRequestException('Order not found');

    // 🚨 Luôn chỉ xem đơn của mình
    if (String(order.createdBy._id) !== String(user._id)) {
      throw new ForbiddenException('Bạn không có quyền xem đơn này');
    }

    return order;
  }


  /** ================================
   *  🔴 Cancel order (user only)
   *  ================================= */
  async cancelMyOrder(id: string, user: IUser) {
    const order = await this.findOne(id, user); // auto check quyền

    if (['SHIPPING', 'DELIVERED', 'RECEIVED'].includes(order.status)) {
      throw new BadRequestException('Đơn hàng đã xử lý, không thể hủy');
    }

    return this.orderModel.updateOne(
      { _id: id },
      {
        status: 'CANCELED',
        updatedBy: { _id: user._id, email: user.email },
      },
    );
  }

  /** ================================
   *  🟢 Admin update shipping/delivery
   *  ================================= */
  async adminUpdateStatus(id: string, status: 'SHIPPING' | 'DELIVERED', user: IUser) {
    if (user.role?.name !== 'ADMIN')
      throw new ForbiddenException('Chỉ admin được cập nhật đơn');

    return this.orderModel.updateOne(
      { _id: id },
      {
        status,
        updatedBy: { _id: user._id, email: user.email },
      },
    );
  }

  /** ================================
   *  🔵 Client confirm received
   *  ================================= */
  async confirmReceived(id: string, user: IUser) {
    const order = await this.findOne(id, user);

    if (order.status !== 'DELIVERED')
      throw new BadRequestException('Đơn chưa giao, không thể xác nhận');

    return this.orderModel.updateOne(
      { _id: id },
      {
        status: 'RECEIVED',
        updatedBy: { _id: user._id, email: user.email },
      },
    );
  }

  // 📌 Admin xem tất cả
  async adminFindAll(current: number, pageSize: number, qs: any) {
    const parsed = aqp(qs);
    const { filter, sort, projection } = parsed;

    delete filter.current;
    delete filter.pageSize;

    const offset = (current - 1) * pageSize;

    const totalItems = await this.orderModel.countDocuments(filter);
    const result = await this.orderModel
      .find(filter, projection)
      .skip(offset)
      .limit(pageSize)
      .sort(sort as any)
      .populate('detail._id')
      .lean();

    return {
      meta: {
        current,
        pageSize,
        total: totalItems,
        pages: Math.ceil(totalItems / pageSize),
      },
      result
    };
  }

  // 📌 Admin xem 1 đơn bất kỳ
  async adminFindOne(id: string) {
    return await this.orderModel
      .findById(id)
      .populate('detail._id')
      .lean();
  }

  async requestReturn(id: string, user: IUser) {
    const order = await this.findOne(id, user);

    if (!order) throw new BadRequestException('Không tìm thấy đơn');

    if (order.status !== 'DELIVERED' && order.status !== 'RECEIVED') {
      throw new BadRequestException('Chỉ hoàn hàng khi đơn đã giao');
    }

    return this.orderModel.updateOne(
      { _id: id },
      {
        status: 'RETURN_REQUESTED',
        updatedBy: { _id: user._id, email: user.email }
      }
    );
  }

  async adminReturnReceived(id: string, admin: IUser) {
    if (admin.role?.name !== 'ADMIN')
      throw new ForbiddenException('Chỉ admin được xác nhận hoàn');

    return this.orderModel.updateOne(
      { _id: id },
      {
        status: 'RETURN_RECEIVED',
        updatedBy: { _id: admin._id, email: admin.email }
      }
    );
  }

}
