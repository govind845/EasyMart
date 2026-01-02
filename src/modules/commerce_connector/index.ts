import { config } from "../../config";

// Import adapters
import * as shopify from "../shopify_adapter/products";
import * as shopifyCart from "../shopify_adapter/cart";
import * as salesforceProducts from "../salesforce_adapter/products";
import * as salesforceCart from "../salesforce_adapter/cart";

const provider = (config.COMMERCE_PROVIDER || "shopify").toLowerCase();

// Products
export const getAllProducts = async (limit?: number, cursor?: any) => {
  if (provider === "salesforce") return (salesforceProducts as any).getAllProducts(limit, cursor);
  return (shopify as any).getAllProducts(limit, cursor);
};

export const getProductDetails = async (productId: string) => {
  if (provider === "salesforce") return (salesforceProducts as any).getProductDetails(productId);
  return (shopify as any).getProductDetails(productId);
};

export const searchProducts = async (query: string, limit?: number) => {
  if (provider === "salesforce") return (salesforceProducts as any).searchProducts(query, limit);
  return (shopify as any).searchProducts(query, limit);
};

export const getProductByHandle = async (handle: string) => {
  if (provider === "salesforce") return (salesforceProducts as any).getProductByHandle(handle);
  return (shopify as any).getProductByHandle(handle);
};

// Cart
export const addToCart = async (payload: any) => {
  if (provider === "salesforce") {
    const action = payload?.action;

    // UPDATE quantity
    if (action === "set") {
      if (!payload.cartItemId) {
        throw new Error("cartItemId is required for update");
      }
      return (salesforceCart as any).updateCartItem(
        payload.cartItemId,
        payload.quantity
      );
    }

    // REMOVE item
    if (action === "remove") {
      if (!payload.cartItemId) {
        throw new Error("cartItemId is required for remove");
      }
      return (salesforceCart as any).removeFromCart(payload.cartItemId);
    }

    // ADD item (default)
    const req: any = {
      productId: payload.productId || payload.product_id || payload.id,
      quantity: payload.quantity || payload.qty || 1,
    };

    if (payload.effectiveAccountId || payload.effective_account_id) {
      req.effectiveAccountId =
        payload.effectiveAccountId || payload.effective_account_id;
    }

    return (salesforceCart as any).addToCartRequest(req);
  }

  // Shopify fallback
  return (shopifyCart as any).addToCart(payload);
  // if (provider === "salesforce") {
  //   // Support both object payloads and simple (productId, quantity) calls.
  //   if (payload && typeof payload === "object") {
  //     // Normalize common field names (productId vs product_id)
  //     const req: any = {
  //       productId: payload.productId || payload.product_id || payload.id,
  //       quantity: payload.quantity || payload.qty || 1,
  //     };
  //     if (payload.effectiveAccountId || payload.effective_account_id) req.effectiveAccountId = payload.effectiveAccountId || payload.effective_account_id;
  //     return (salesforceCart as any).addToCartRequest(req);
  //   }

  //   // If caller passed primitive productId and quantity separately
  //   if (typeof payload === "string") {
  //     return (salesforceCart as any).addToCart(payload, 1);
  //   }
  //   return (salesforceCart as any).addToCartRequest(payload);
  // }
  // return (shopifyCart as any).addToCart(payload);

};

export const getCart = async () => {
  if (provider === "salesforce") return (salesforceCart as any).getCart();
  return (shopifyCart as any).getCart();
};

export const updateCartItem = async (cartItemId: string, quantity?: number) => {
  if (provider === "salesforce") return (salesforceCart as any).updateCartItem(cartItemId, quantity);
  return (shopifyCart as any).updateCartItem(cartItemId, quantity);
};

export const removeFromCart = async (cartItemId: string) => {
  if (provider === "salesforce") return (salesforceCart as any).removeFromCart(cartItemId);
  return (shopifyCart as any).removeFromCart(cartItemId);
};

export default {
  getAllProducts,
  getProductDetails,
  searchProducts,
  getProductByHandle,
  addToCart,
  getCart,
  updateCartItem,
  removeFromCart,
};
