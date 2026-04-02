import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AddressesService } from './addresses.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('addresses')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('CUSTOMER')
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Get()
  getAddresses(@Request() req) {
    return this.addressesService.getAddresses(req.user.id);
  }

  @Post()
  createAddress(@Request() req, @Body() dto: CreateAddressDto) {
    return this.addressesService.createAddress(req.user.id, dto);
  }

  @Patch(':id')
  updateAddress(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.addressesService.updateAddress(req.user.id, id, dto);
  }

  @Delete(':id')
  deleteAddress(@Request() req, @Param('id') id: string) {
    return this.addressesService.deleteAddress(req.user.id, id);
  }

  @Patch(':id/default')
  setDefault(@Request() req, @Param('id') id: string) {
    return this.addressesService.setDefault(req.user.id, id);
  }
}