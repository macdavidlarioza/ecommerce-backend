import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // Customer: create an order from selected cart items
  @Post()
  @UseGuards(RolesGuard)
  @Roles('CUSTOMER')
  createOrder(@Request() req, @Body() dto: CreateOrderDto) {
    return this.ordersService.createOrder(req.user.id, dto);
  }

  // Customer: get their own order history
  @Get()
  @UseGuards(RolesGuard)
  @Roles('CUSTOMER')
  getMyOrders(@Request() req) {
    return this.ordersService.getMyOrders(req.user.id);
  }

  // Admin: get all orders — must come BEFORE /:id to avoid route conflict
  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  getAllOrders() {
    return this.ordersService.getAllOrders();
  }

  // Customer: get a single order by ID
  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('CUSTOMER')
  getMyOrderById(@Request() req, @Param('id') id: string) {
    return this.ordersService.getMyOrderById(req.user.id, id);
  }

  // Admin: update order status
  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  updateOrderStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.ordersService.updateOrderStatus(id, status);
  }
}