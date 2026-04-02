import { IsNotEmpty, IsString } from 'class-validator';

export class CreateIntentDto {
  @IsString()
  @IsNotEmpty()
  orderId: string;
}