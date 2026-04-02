import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class CreateOrderDto {
  @IsArray()
  @IsNotEmpty()
  cartItemIds: string[];

  @IsString()
  @IsNotEmpty()
  addressId: string;
}