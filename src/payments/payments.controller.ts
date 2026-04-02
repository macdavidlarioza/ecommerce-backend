import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Headers,
  HttpCode,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreateIntentDto } from './dto/create-intent.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // Customer creates a payment intent for their order
  @Post('create-intent')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CUSTOMER')
  createIntent(@Request() req, @Body() dto: CreateIntentDto) {
    return this.paymentsService.createPaymentIntent(req.user.id, dto.orderId);
  }

  // PayMongo calls this webhook automatically — no JWT needed
  @Post('webhook')
  @HttpCode(200)
  handleWebhook(@Body() payload: any) {
    return this.paymentsService.handleWebhook(payload);
  }
}