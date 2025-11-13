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

  /** 📊 Tạo thống kê tổng quan Dashboard */
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
    const orders = await this.orderModel
      .find({ isDeleted: { $ne: true } })
      .select('totalPrice');
    const totalRevenue = orders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);

    // 4️⃣ Tổng danh mục
    const totalCategories = await this.categoryModel.countDocuments({
      $or: [{ isDeleted: false }, { isDeleted: null }],
    });

    // 5️⃣ Lấy toàn bộ danh mục + số lượng sản phẩm (cha - con)
    const allCategories = await this.categoryModel
      .find({ $or: [{ isDeleted: false }, { isDeleted: null }] })
      .populate('parentCategory', 'name')
      .lean();

    const allProducts = await this.productModel
      .find({ $or: [{ isDeleted: false }, { isDeleted: null }] })
      .select('category')
      .lean();

    // 🧮 Đếm sản phẩm theo danh mục
    const productCountMap = new Map<string, number>();
    for (const p of allProducts) {
      const catId = p.category?.toString();
      if (catId) {
        productCountMap.set(catId, (productCountMap.get(catId) || 0) + 1);
      }
    }

    // 🧩 Tạo map danh mục và gắn productCount
    const map = new Map<string, any>();
    const roots: any[] = [];

    for (const cat of allCategories) {
      const catId = cat._id.toString();
      map.set(catId, {
        _id: cat._id,
        name: cat.name,
        productCount: productCountMap.get(catId) || 0,
        parentCategory: cat.parentCategory ?? null,
        children: [],
      });
    }

    // 🧱 Liên kết cha - con (fix lỗi FlattenMaps<ObjectId>)
    for (const cat of map.values()) {
      let parentId: string | null = null;

      if (cat.parentCategory) {
        if (
          typeof cat.parentCategory === 'object' &&
          cat.parentCategory._id
        ) {
          parentId = cat.parentCategory._id.toString();
        } else if (typeof cat.parentCategory === 'string') {
          parentId = cat.parentCategory;
        } else if (cat.parentCategory instanceof Object) {
          parentId = cat.parentCategory.toString();
        }
      }

      if (parentId && map.has(parentId)) {
        map.get(parentId).children.push(cat);
      } else if (!parentId) {
        roots.push(cat);
      }
    }

    // 🔁 Cộng tổng sản phẩm (cha = sản phẩm trực tiếp + của con)
    function sumProducts(node: any): number {
      let total = node.productCount || 0;
      if (node.children?.length) {
        for (const child of node.children) {
          total += sumProducts(child);
        }
      }
      node.totalProducts = total;
      return total;
    }

    for (const r of roots) {
      sumProducts(r);
    }

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
      .find({ $or: [{ isDeleted: false }, { isDeleted: null }] })
      .sort({ sold: -1 })
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
      categoriesStats: roots, // ✅ Danh mục cha - con
      recentOrders,
      lowStockProducts,
      topSellingProducts,
    };
  }

  /** Mỗi lần gọi /dashboard sẽ tự động cập nhật dữ liệu mới */
  async findAll(query?: { lowStock?: string; limit?: string }) {
    return this.createDailyStats();
  }
}
