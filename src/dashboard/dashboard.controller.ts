import { Controller, Get, Post, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { ResponseMessage } from 'src/decorator/customize';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) { }

  /**
   * GET /api/v1/dashboard
   * Trả về thống kê tổng quan:
   * - Tổng đơn hàng
   * - Tổng sản phẩm
   * - Doanh thu
   * - Danh mục
   * - Đơn hàng gần đây
   * - Sản phẩm sắp hết hàng
   */
  @Get()
  @ResponseMessage('Lấy thống kê tổng quan Dashboard')
  async getStats(
    @Query('lowStock') lowStock?: string,
    @Query('limit') limit?: string,
  ) {
    return this.dashboardService.findAll({
      lowStock,
      limit,
    } as any);
  }

  /**
   * POST /api/v1/dashboard
   * Tạo snapshot thống kê mới và lưu vào DB
   */
  @Post()
  @ResponseMessage('Tạo thống kê mới')
  async createSnapshot() {
    return this.dashboardService.createDailyStats();
  }
}
