import { Controller, Post, Body, Get, Param, Query, Patch } from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { ResponseMessage, User } from 'src/decorator/customize';
import { IUser } from 'src/users/users.interface';

@Controller('order')
export class OrderController {
  constructor(private readonly orderService: OrderService) { }

  @Post()
  @ResponseMessage('Create new Order')
  create(@Body() createOrderDto: CreateOrderDto, @User() user: IUser) {
    return this.orderService.create(createOrderDto, user);
  }

  @Get()
  @ResponseMessage('List all orders (with pagination)')
  findAll(
    @Query('current') current: string,
    @Query('pageSize') pageSize: string,
    @Query() qs: any
  ) {
    return this.orderService.findAll(+current, +pageSize, qs);
  }

  @Get(':id')
  @ResponseMessage('Get order detail')
  findOne(@Param('id') id: string) {
    return this.orderService.findOne(id);
  }

  // Client hủy đơn (chỉ khi chưa giao)
  @Patch(':id/cancel')
  @ResponseMessage('Cancel my order')
  cancel(@Param('id') id: string, @User() user: IUser) {
    return this.orderService.cancelMyOrder(id, user);
  }

  // Client xác nhận đã nhận (khi admin đã DELIVERED)
  @Patch(':id/confirm-received')
  @ResponseMessage('Confirm order received')
  confirmReceived(@Param('id') id: string, @User() user: IUser) {
    return this.orderService.confirmReceived(id, user);
  }

  // (Admin) cập nhật sang SHIPPING / DELIVERED (nếu chưa có endpoint)
  @Patch(':id/admin-status')
  @ResponseMessage('Admin update order status')
  adminStatus(@Param('id') id: string, @Body('status') status: 'SHIPPING' | 'DELIVERED', @User() admin: IUser) {
    return this.orderService.adminUpdateStatus(id, status, admin);
  }

  // Client yêu cầu hoàn hàng
  @Patch(':id/request-return')
  @ResponseMessage('Yêu cầu hoàn hàng')
  requestReturn(@Param('id') id: string, @User() user: IUser) {
    return this.orderService.requestReturn(id, user);
  }

  // Admin xác nhận đã nhận hàng hoàn
  @Patch(':id/admin-return-received')
  @ResponseMessage('Admin xác nhận đã nhận hàng hoàn')
  adminReturnReceived(@Param('id') id: string, @User() admin: IUser) {
    return this.orderService.adminConfirmReturnReceived(id, admin);
  }

  // Admin chấp nhận yêu cầu hoàn hàng
  @Patch(':id/admin-approve-return')
  @ResponseMessage('Admin chấp nhận yêu cầu hoàn hàng')
  adminApproveReturn(@Param('id') id: string, @User() admin: IUser) {
    return this.orderService.adminApproveReturn(id, admin);
  }

  // Admin từ chối yêu cầu hoàn hàng
  @Patch(':id/admin-reject-return')
  @ResponseMessage('Admin từ chối yêu cầu hoàn hàng')
  adminRejectReturn(@Param('id') id: string, @User() admin: IUser) {
    return this.orderService.adminRejectReturn(id, admin);
  }

}

