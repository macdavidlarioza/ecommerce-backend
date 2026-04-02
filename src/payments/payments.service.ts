import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  private get authHeader() {
    const key = process.env.PAYMONGO_SECRET_KEY;
    const encoded = Buffer.from(`${key}:`).toString('base64');
    return `Basic ${encoded}`;
  }

  async createPaymentIntent(userId: string, orderId: string) {
    // 1. Find the order and make sure it belongs to this user
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
    });

    if (!order) throw new NotFoundException('Order not found.');
    if (order.paymentStatus === 'PAID') {
      throw new BadRequestException('This order has already been paid.');
    }

    // 2. Convert total to centavos (PayMongo uses the smallest currency unit)
    //    ₱100.00 → 10000
    const amountInCentavos = Math.round(Number(order.totalAmount) * 100);

    // 3. Call PayMongo API to create a Payment Intent
    const response = await axios.post(
      'https://api.paymongo.com/v1/payment_intents',
      {
        data: {
          attributes: {
            amount: amountInCentavos,
            payment_method_allowed: ['gcash', 'paymaya', 'card'],
            payment_method_options: {
              card: { request_three_d_secure: 'any' },
            },
            currency: 'PHP',
            capture_type: 'automatic',
            description: `macbid order ${order.id}`,
          },
        },
      },
      {
        headers: {
          Authorization: this.authHeader,
          'Content-Type': 'application/json',
        },
      },
    );

    const intent = response.data.data;

    // 4. Save the payment intent ID to the order for reference
    await this.prisma.order.update({
      where: { id: orderId },
      data: { paymongoPaymentIntentId: intent.id },
    });

    // 5. Return the client_key — the frontend needs this to process payment
    return {
      paymentIntentId: intent.id,
      clientKey: intent.attributes.client_key,
      amount: amountInCentavos,
    };
  }

  async handleWebhook(payload: any) {
    const eventType = payload?.data?.attributes?.type;
    const paymentData = payload?.data?.attributes?.data;

    if (!eventType || !paymentData) return { received: true };

    if (eventType === 'payment.paid') {
      // Extract the payment intent ID from the webhook payload
      const paymentIntentId =
        paymentData?.attributes?.payment_intent_id ?? null;

      if (!paymentIntentId) return { received: true };

      // Find the order with this payment intent ID
      const order = await this.prisma.order.findFirst({
        where: { paymongoPaymentIntentId: paymentIntentId },
      });

      if (!order) return { received: true };

      // Mark the order as PAID and CONFIRMED
      await this.prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'PAID',
          status: 'CONFIRMED',
        },
      });
    }

    if (eventType === 'payment.failed') {
      const paymentIntentId =
        paymentData?.attributes?.payment_intent_id ?? null;

      if (!paymentIntentId) return { received: true };

      const order = await this.prisma.order.findFirst({
        where: { paymongoPaymentIntentId: paymentIntentId },
      });

      if (!order) return { received: true };

      // Mark the order as CANCELLED if payment failed
      await this.prisma.order.update({
        where: { id: order.id },
        data: { status: 'CANCELLED' },
      });
    }

    return { received: true };
  }
}