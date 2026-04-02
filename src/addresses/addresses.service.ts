import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressesService {
  constructor(private prisma: PrismaService) {}

  async getAddresses(userId: string) {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { id: 'asc' }],
    });
  }

  async createAddress(userId: string, dto: CreateAddressDto) {
    // If this is marked as default, unset all other defaults first
    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    // If this is the user's first address, make it default automatically
    const existingCount = await this.prisma.address.count({ where: { userId } });
    const shouldBeDefault = dto.isDefault || existingCount === 0;

    return this.prisma.address.create({
      data: {
        userId,
        fullName: dto.fullName,
        street: dto.street,
        city: dto.city,
        province: dto.province,
        postalCode: dto.postalCode,
        phone: dto.phone,
        isDefault: shouldBeDefault,
      },
    });
  }

  async updateAddress(userId: string, addressId: string, dto: UpdateAddressDto) {
    const address = await this.prisma.address.findUnique({
      where: { id: addressId },
    });

    if (!address) throw new NotFoundException('Address not found.');
    if (address.userId !== userId) throw new ForbiddenException('Access denied.');

    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    return this.prisma.address.update({
      where: { id: addressId },
      data: dto,
    });
  }

  async deleteAddress(userId: string, addressId: string) {
    const address = await this.prisma.address.findUnique({
      where: { id: addressId },
    });

    if (!address) throw new NotFoundException('Address not found.');
    if (address.userId !== userId) throw new ForbiddenException('Access denied.');

    await this.prisma.address.delete({ where: { id: addressId } });

    // If the deleted address was the default, make the first remaining one default
    if (address.isDefault) {
      const first = await this.prisma.address.findFirst({ where: { userId } });
      if (first) {
        await this.prisma.address.update({
          where: { id: first.id },
          data: { isDefault: true },
        });
      }
    }

    return { message: 'Address deleted.' };
  }

  async setDefault(userId: string, addressId: string) {
    const address = await this.prisma.address.findUnique({
      where: { id: addressId },
    });

    if (!address) throw new NotFoundException('Address not found.');
    if (address.userId !== userId) throw new ForbiddenException('Access denied.');

    // Unset all defaults for this user
    await this.prisma.address.updateMany({
      where: { userId },
      data: { isDefault: false },
    });

    // Set the chosen one as default
    return this.prisma.address.update({
      where: { id: addressId },
      data: { isDefault: true },
    });
  }
}