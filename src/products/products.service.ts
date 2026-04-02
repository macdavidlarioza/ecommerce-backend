import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateProductDto) {
  const slug = dto.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  return this.prisma.product.create({
    data: {
      name: dto.name,
      slug,
      categoryId: dto.categoryId,
      description: dto.description,
      isActive: dto.isActive ?? true,
      images: dto.images && dto.images.length > 0 ? {
        create: dto.images.map((img, index) => ({
          url: img.url,
          isPrimary: index === 0,
          sortOrder: index,
        })),
      } : undefined,
      variants: {
        create: dto.variants.map((v) => ({
          sku: v.sku,
          name: v.name,
          price: v.price,
          inventory: {
            create: { quantity: v.stock },
          },
        })),
      },
    },
    include: {
      images: true,
      variants: { include: { inventory: true } },
    },
  });
}

  async findAll() {
    return this.prisma.product.findMany({
      where: { isActive: true },
      include: {
        category: true,
        images: true,
        variants: { include: { inventory: true } },
      },
    });
  }

  async findAllAdmin() {
  return this.prisma.product.findMany({
    include: {
      category: true,
      images: true,
      variants: { include: { inventory: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

  async findOne(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: {
        category: true,
        images: true,
        variants: { include: { inventory: true } },
      },
    });

    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async update(id: string, dto: UpdateProductDto) {
  const product = await this.prisma.product.findUnique({ where: { id } });
  if (!product) throw new NotFoundException('Product not found');

  const slug = dto.name
    ? dto.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    : undefined;

  return this.prisma.product.update({
    where: { id },
    data: {
      ...(dto.name && { name: dto.name, slug }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      ...(dto.categoryId && { categoryId: dto.categoryId }),
      ...(dto.images && {
        images: {
          deleteMany: {},
          create: dto.images.map((img, index) => ({
            url: img.url,
            isPrimary: index === 0,
            sortOrder: index,
          })),
        },
      }),
    },
    include: {
      images: true,
      variants: { include: { inventory: true } },
    },
  });
}

async updateVariants(id: string, variants: any[]) {
  const product = await this.prisma.product.findUnique({
    where: { id },
    include: { variants: { include: { inventory: true } } },
  });
  if (!product) throw new NotFoundException('Product not found');

  for (const variant of variants) {
    if (variant.id) {
      // Update existing variant
      await this.prisma.productVariant.update({
        where: { id: variant.id },
        data: {
          name: variant.name,
          sku: variant.sku,
          price: variant.price,
          isActive: variant.isActive ?? true,
          inventory: {
            update: { quantity: variant.stock },
          },
        },
      });
    } else {
      // Create new variant
      await this.prisma.productVariant.create({
        data: {
          productId: id,
          name: variant.name,
          sku: variant.sku,
          price: variant.price,
          isActive: variant.isActive ?? true,
          inventory: {
            create: { quantity: variant.stock },
          },
        },
      });
    }
  }

  return this.prisma.product.findUnique({
    where: { id },
    include: {
      images: true,
      variants: { include: { inventory: true } },
    },
  });
}

async removeVariant(productId: string, variantId: string) {
  const variant = await this.prisma.productVariant.findFirst({
    where: { id: variantId, productId },
  });
  if (!variant) throw new NotFoundException('Variant not found');

  await this.prisma.productVariant.delete({ where: { id: variantId } });
  return { message: 'Variant removed successfully' };
}

  async remove(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');

    await this.prisma.product.delete({ where: { id } });
    return { message: 'Product deleted successfully' };
  }
}