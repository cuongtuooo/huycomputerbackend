import { Controller, Post, Body, Get, Param, Query, Patch } from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { ResponseMessage, User } from 'src/decorator/customize';
import { IUser } from 'src/users/users.interface';

@Controller('order')
export class OrderController {
  constructor(private readonly orderService: OrderService) { }

  @Post()
  @ResponseMessage('Create new order')
  create(@Body() dto: CreateOrderDto, @User() user: IUser) {
    return this.orderService.create(dto, user);
  }

  @Get()
  @ResponseMessage('List orders')
  findAll(
    @Query('current') current: string,
    @Query('pageSize') pageSize: string,
    @Query() qs: any,
    @User() user: IUser,
  ) {
    return this.orderService.findAll(+current, +pageSize, qs, user);
  }

  @Get(':id')
  @ResponseMessage('Get order detail')
  findOne(@Param('id') id: string, @User() user: IUser) {
    return this.orderService.findOne(id, user);
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string, @User() user: IUser) {
    return this.orderService.cancelMyOrder(id, user);
  }

  @Patch(':id/confirm-received')
  confirm(@Param('id') id: string, @User() user: IUser) {
    return this.orderService.confirmReceived(id, user);
  }

  @Patch(':id/admin-status')
  adminUpdate(
    @Param('id') id: string,
    @Body('status') status: 'SHIPPING' | 'DELIVERED',
    @User() admin: IUser,
  ) {
    return this.orderService.adminUpdateStatus(id, status, admin);
  }

  @Patch(':id/request-return')
  @ResponseMessage('Client yêu cầu hoàn hàng')
  requestReturn(
    @Param('id') id: string,
    @User() user: IUser
  ) {
    return this.orderService.requestReturn(id, user);
  }


  @Patch(':id/admin-return-received')
  @ResponseMessage('Admin xác nhận đã nhận hàng hoàn')
  adminReturnReceived(
    @Param('id') id: string,
    @User() admin: IUser
  ) {
    return this.orderService.adminReturnReceived(id, admin);
  }

}
