import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ProductsModule } from './products/products.module';
import { CategoriesModule } from './categories/categories.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { AddressesModule } from './addresses/addresses.module';

@Module({
  imports: [PrismaModule, AuthModule, ProductsModule, CategoriesModule, CartModule, OrdersModule, PaymentsModule, AddressesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}