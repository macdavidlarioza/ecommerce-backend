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

  async createCheckoutSession(userId: string, orderId: string) {
    // 1. Find the order and make sure it belongs to this user
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });

    if (!order) throw new NotFoundException('Order not found.');
    if (order.paymentStatus === 'PAID') {
      throw new BadRequestException('This order has already been paid.');
    }

    // 2. Build line items for the checkout session
    const lineItems = order.items.map((item) => ({
      currency: 'PHP',
      amount: Math.round(Number(item.price) * 100),
      name: `${item.variant.product.name} - ${item.variant.name}`,
      quantity: item.quantity,
    }));

    // 3. Create a PayMongo Checkout Session
    const response = await axios.post(
      'https://api.paymongo.com/v1/checkout_sessions',
      {
        data: {
          attributes: {
            line_items: lineItems,
            payment_method_types: ['gcash', 'paymaya', 'card'],
            success_url: `${process.env.FRONTEND_URL}/payments/success?order_id=${order.id}`,
            cancel_url: `${process.env.FRONTEND_URL}/payments/cancel`,
            description: `macbid order ${order.id}`,
            send_email_receipt: false,
            show_description: true,
            show_line_items: true,
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

    const session = response.data.data;

    // 4. Save the session ID to the order for webhook reference
    await this.prisma.order.update({
      where: { id: orderId },
      data: { paymongoPaymentIntentId: session.id },
    });

    // 5. Return the checkout URL — frontend will redirect here
    return {
      checkoutUrl: session.attributes.checkout_url,
      sessionId: session.id,
    };
  }

  async handleWebhook(payload: any) {
    const eventType = payload?.data?.attributes?.type;
    const eventData = payload?.data?.attributes?.data;

    if (!eventType || !eventData) return { received: true };

    if (
      eventType === 'payment.paid' ||
      eventType === 'checkout_session.payment.paid'
    ) {
      let sessionId: string | null = null;

      // For checkout_session.payment.paid, the data IS the session
      if (eventType === 'checkout_session.payment.paid') {
        sessionId = eventData?.id ?? null;
      }

      // For payment.paid, extract from metadata or payment intent
      if (eventType === 'payment.paid') {
        sessionId =
          eventData?.attributes?.payment_intent_id ??
          eventData?.attributes?.checkout_session_id ??
          null;
      }

      if (!sessionId) return { received: true };

      const order = await this.prisma.order.findFirst({
        where: { paymongoPaymentIntentId: sessionId },
      });

      if (!order) return { received: true };

      await this.prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'PAID',
          status: 'CONFIRMED',
        },
      });
    }

    if (eventType === 'payment.failed') {
      const sessionId =
        eventData?.attributes?.payment_intent_id ??
        eventData?.attributes?.checkout_session_id ??
        null;

      if (!sessionId) return { received: true };

      const order = await this.prisma.order.findFirst({
        where: { paymongoPaymentIntentId: sessionId },
      });

      if (!order) return { received: true };

      await this.prisma.order.update({
        where: { id: order.id },
        data: { status: 'CANCELLED' },
      });
    }

    return { received: true };
  }
}