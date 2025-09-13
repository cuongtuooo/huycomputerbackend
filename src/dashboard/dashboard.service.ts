import { Injectable } from '@nestjs/common';
import { CreateDashboardDto } from './dto/create-dashboard.dto';
import { UpdateDashboardDto } from './dto/update-dashboard.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument } from 'src/order/schemas/order.schema';
import { Dashboard, DashboardDocument } from './schemas/dashboard.schemas';
import { Product, ProductDocument } from 'src/products/schemas/products.schemas';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Dashboard.name) private dashboardModel: Model<DashboardDocument>,
  ) { }

  async createDailyStats() {
    const totalProducts = await this.productModel.countDocuments({
      $or: [{ isDeleted: false }, { isDeleted: null }]
    });

    const totalOrders = await this.orderModel.countDocuments({
      $or: [{ isDeleted: false }, { isDeleted: null }]
    });

    const orders = await this.orderModel.find({ isDeleted: null }).select('totalPrice');
    const totalRevenue = orders.reduce((sum, order) => sum + (order.totalPrice || 0), 0);

    const dashboard = await this.dashboardModel.create({
      totalProducts,
      totalOrders,
      totalRevenue
    });

    return dashboard;
  }

  create(createDashboardDto: CreateDashboardDto) {
    return 'This action adds a new dashboard';
  }
  async findAll() {
    // Tự động tạo thống kê mới mỗi khi gọi GET
    const todayStat = await this.createDailyStats();

    // Trả về thống kê mới nhất (hoặc toàn bộ, tùy bạn)
    return todayStat; // hoặc return await this.dashboardModel.find().sort({ createdAt: -1 });
  }

  findOne(id: number) {
    return `This action returns a #${id} dashboard`;
  }

  update(id: number, updateDashboardDto: UpdateDashboardDto) {
    return `This action updates a #${id} dashboard`;
  }

  remove(id: number) {
    return `This action removes a #${id} dashboard`;
  }
}
