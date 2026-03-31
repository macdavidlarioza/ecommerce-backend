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
      },
      include: {
        variants: { include: { inventory: true } },
      },
    });
  }

  async remove(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');

    await this.prisma.product.delete({ where: { id } });
    return { message: 'Product deleted successfully' };
  }
}