import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async createOrder(userId: string, dto: CreateOrderDto) {
    const { cartItemIds, addressId } = dto;

    // 1. Verify the address belongs to this user
    const address = await this.prisma.address.findFirst({
      where: { id: addressId, userId },
    });
    if (!address) {
      throw new NotFoundException('Address not found.');
    }

    // 2. Fetch the cart items with variant and inventory info
    const cartItems = await this.prisma.cartItem.findMany({
      where: {
        id: { in: cartItemIds },
        cart: { userId },
      },
      include: {
        variant: {
          include: { inventory: true },
        },
      },
    });

    if (cartItems.length === 0) {
      throw new BadRequestException('No valid cart items found.');
    }

    if (cartItems.length !== cartItemIds.length) {
      throw new BadRequestException('Some cart items are invalid or do not belong to you.');
    }

    // 3. Check inventory for each item
    for (const item of cartItems) {
      const stock = item.variant.inventory?.quantity ?? 0;
      if (item.quantity > stock) {
        throw new BadRequestException(
          `Not enough stock for variant: ${item.variant.name}. Available: ${stock}`,
        );
      }
    }

    // 4. Calculate total
    const totalAmount = cartItems.reduce((sum, item) => {
      return sum + Number(item.variant.price) * item.quantity;
    }, 0);

    // 5. Create the order, order items, decrement inventory, remove cart items
    //    All in one transaction so if anything fails, nothing is saved
    const order = await this.prisma.$transaction(async (tx) => {
      // Create the order
      const newOrder = await tx.order.create({
        data: {
          userId,
          addressId,
          totalAmount,
          items: {
            create: cartItems.map((item) => ({
              variantId: item.variantId,
              quantity: item.quantity,
              price: item.variant.price,
            })),
          },
        },
        include: {
          items: {
            include: {
              variant: {
                include: {
                  product: {
                    include: { images: true },
                  },
                },
              },
            },
          },
          address: true,
        },
      });

      // Decrement inventory for each variant
      for (const item of cartItems) {
        await tx.inventory.update({
          where: { variantId: item.variantId },
          data: { quantity: { decrement: item.quantity } },
        });
      }

      // Remove the selected cart items
      await tx.cartItem.deleteMany({
        where: { id: { in: cartItemIds } },
      });

      return newOrder;
    });

    return order;
  }

  async getMyOrders(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  include: { images: true },
                },
              },
            },
          },
        },
        address: true,
      },
    });
  }

  async getMyOrderById(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  include: { images: true },
                },
              },
            },
          },
        },
        address: true,
      },
    });

    if (!order) throw new NotFoundException('Order not found.');
    return order;
  }

  async getAllOrders() {
    return this.prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        items: {
          include: {
            variant: {
              include: {
                product: {
                  include: { images: true },
                },
              },
            },
          },
        },
        address: true,
      },
    });
  }

  async updateOrderStatus(orderId: string, status: string) {
    const validStatuses = ['CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException('Invalid status value.');
    }

    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found.');

    return this.prisma.order.update({
      where: { id: orderId },
      data: { status: status as any },
    });
  }
}