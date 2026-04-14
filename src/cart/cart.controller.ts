import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  ParseUUIDPipe,
} from "@nestjs/common";

import { CartService } from "./cart.service";
import { AddToCartDto } from "./dto/add-to-cart.dto";
import { UpdateCartItemDto } from "./dto/update-cart-item.dto";

import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import type { AuthenticatedRequest } from "../common/interfaces/authenticated-request.interface";

@UseGuards(JwtAuthGuard)
@Controller("cart")
export class CartController {
  constructor(private readonly cartService: CartService) {}

  // ================= ADD TO CART =================
  @Post()
  addToCart(@Req() req: AuthenticatedRequest, @Body() dto: AddToCartDto) {
    return this.cartService.addToCart(req.user.userId, dto);
  }

  // ================= GET CART =================
  @Get()
  getCart(@Req() req: AuthenticatedRequest) {
    return this.cartService.getCart(req.user.userId);
  }

  // ================= UPDATE ITEM =================
  @Patch(":itemId")
  updateItem(
    @Req() req: AuthenticatedRequest,
    @Param("itemId", ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItem(req.user.userId, itemId, dto);
  }

  // ================= REMOVE ITEM =================
  @Delete(":itemId")
  removeItem(
    @Req() req: AuthenticatedRequest,
    @Param("itemId", ParseUUIDPipe) itemId: string,
  ) {
    return this.cartService.removeItem(req.user.userId, itemId);
  }
}
