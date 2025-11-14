import { Controller, Get, Query, Param } from '@nestjs/common';
import { OrderService } from './order.service';
import { ResponseMessage } from 'src/decorator/customize';

@Controller('admin/order')
export class AdminOrderController {
    constructor(private readonly orderService: OrderService) { }

    @Get()
    @ResponseMessage('Admin get all orders')
    getAllOrders(
        @Query('current') current: string,
        @Query('pageSize') pageSize: string,
        @Query() qs: any,
    ) {
        return this.orderService.adminFindAll(+current, +pageSize, qs);
    }

    @Get(':id')
    @ResponseMessage('Admin get order detail')
    getOrderDetail(@Param('id') id: string) {
        return this.orderService.adminFindOne(id);
    }
}
