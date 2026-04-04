import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { IsNotEmpty, IsString } from 'class-validator';
import { Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';

class CreateCheckoutDto {
  @IsString()
  @IsNotEmpty()
  orderId!: string;
}

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-checkout')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CUSTOMER')
  createCheckout(@Request() req, @Body() dto: CreateCheckoutDto) {
    return this.paymentsService.createCheckoutSession(req.user.id, dto.orderId);
  }

  @Post('webhook')
  @HttpCode(200)
  handleWebhook(@Body() payload: any) {
    return this.paymentsService.handleWebhook(payload);
  }

  @Get('success')
  handleSuccess(@Query('order_id') orderId: string, @Res() res: Response) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return res.redirect(`${frontendUrl}/order-success?order_id=${orderId}`);
  }

  @Get('cancel')
  handleCancel(@Res() res: Response) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return res.redirect(`${frontendUrl}/checkout`);
  }
}