import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument } from 'src/products/schemas/products.schemas';
import { Order, OrderDocument } from 'src/order/schemas/order.schema';
import { Dashboard, DashboardDocument } from './schemas/dashboard.schemas';
import { Category, CategoryDocument } from 'src/category/schemas/category.schema';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Dashboard.name) private dashboardModel: Model<DashboardDocument>,
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>,
  ) { }

  /**
   * 📊 Tạo thống kê Dashboard tổng quan:
   *  - Tổng sản phẩm
   *  - Tổng đơn hàng
   *  - Tổng doanh thu
   *  - Tổng danh mục
   *  - Thống kê danh mục sản phẩm
   *  - Đơn hàng gần đây
   *  - Sản phẩm sắp hết hàng
   *  - Sản phẩm bán chạy nhất
   */
  async createDailyStats() {
    // 1️⃣ Tổng sản phẩm
    const totalProducts = await this.productModel.countDocuments({
      $or: [{ isDeleted: false }, { isDeleted: null }],
    });

    // 2️⃣ Tổng đơn hàng
    const totalOrders = await this.orderModel.countDocuments({
      $or: [{ isDeleted: false }, { isDeleted: null }],
    });

    // 3️⃣ Tổng doanh thu
    const orders = await this.orderModel.find({ isDeleted: { $ne: true } }).select('totalPrice');
    const totalRevenue = orders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);

    // 4️⃣ Tổng danh mục
    const totalCategories = await this.categoryModel.countDocuments({
      $or: [{ isDeleted: false }, { isDeleted: null }],
    });

    // 5️⃣ Thống kê từng danh mục + số sản phẩm trong danh mục
    const categoriesStats = await this.productModel.aggregate([
      { $match: { $or: [{ isDeleted: false }, { isDeleted: null }] } },
      {
        $group: {
          _id: '$category',
          productCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'categories', // tên collection
          localField: '_id',
          foreignField: '_id',
          as: 'categoryInfo',
        },
      },
      { $unwind: '$categoryInfo' },
      {
        $project: {
          _id: 0,
          categoryId: '$categoryInfo._id',
          categoryName: '$categoryInfo.name',
          productCount: 1,
        },
      },
      { $sort: { productCount: -1 } },
    ]);

    // 6️⃣ Đơn hàng gần đây
    const recentOrders = await this.orderModel
      .find({ isDeleted: { $ne: true } })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('_id name totalPrice status createdBy createdAt')
      .lean();

    // 7️⃣ Sản phẩm sắp hết hàng
    const lowStockProducts = await this.productModel
      .find({
        $or: [{ isDeleted: false }, { isDeleted: null }],
        quantity: { $lt: 5 },
      })
      .limit(5)
      .select('name price quantity category')
      .populate('category', 'name')
      .lean();

    // 8️⃣ Sản phẩm bán chạy nhất
    const topSellingProducts = await this.productModel
      .find({
        $or: [{ isDeleted: false }, { isDeleted: null }],
      })
      .sort({ sold: -1 }) // sắp xếp theo số lượng bán giảm dần
      .limit(5)
      .select('name price sold quantity category')
      .populate('category', 'name')
      .lean();

    // 9️⃣ Lưu snapshot cơ bản
    await this.dashboardModel.create({
      date: new Date(),
      totalProducts,
      totalOrders,
      totalRevenue,
      totalCategories,
    });

    // 🔟 Trả dữ liệu cho frontend
    return {
      totalProducts,
      totalOrders,
      totalRevenue,
      totalCategories,
      categoriesStats,
      recentOrders,
      lowStockProducts,
      topSellingProducts,
    };
  }

  /**
   * GET /dashboard
   * Mỗi lần gọi sẽ tự động tạo thống kê mới nhất
   */
  async findAll(query?: { lowStock?: string; limit?: string }) {
    return this.createDailyStats();
  }
}
