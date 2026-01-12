import { config } from "../../config";

// Import adapters
import * as shopify from "../shopify_adapter/products";
import * as shopifyCart from "../shopify_adapter/cart";
import * as salesforceProducts from "../salesforce_adapter/products";
import * as salesforceCart from "../salesforce_adapter/cart";
import * as shopwareProducts from "../shopware_adapter/products";
import * as shopwareCart from "../shopware_adapter/cart";

const provider = (config.COMMERCE_PROVIDER || "shopify").toLowerCase();

// ============ Products ============

export const getAllProducts = async (limit?: number, cursor?: any) => {
  if (provider === "salesforce") {
    return (salesforceProducts as any).getAllProducts(limit, cursor);
  }
  if (provider === "shopware") {
    return (shopwareProducts as any).getAllProducts(limit, cursor);
  }
  return (shopify as any).getAllProducts(limit, cursor);
};

export const getProductDetails = async (productId: string) => {
  if (provider === "salesforce") {
    return (salesforceProducts as any).getProductDetails(productId);
  }
  if (provider === "shopware") {
    return (shopwareProducts as any).getProductDetails(productId);
  }
  return (shopify as any).getProductDetails(productId);
};

export const searchProducts = async (query: string, limit?: number) => {
  if (provider === "salesforce") {
    return (salesforceProducts as any).searchProducts(query, limit);
  }
  if (provider === "shopware") {
    return (shopwareProducts as any).searchProducts(query, limit);
  }
  return (shopify as any).searchProducts(query, limit);
};

export const getProductByHandle = async (handle: string) => {
  if (provider === "salesforce") {
    return (salesforceProducts as any).getProductByHandle(handle);
  }
  if (provider === "shopware") {
    return (shopwareProducts as any).getProductByHandle(handle);
  }
  return (shopify as any).getProductByHandle(handle);
};

// ============ Cart ============

interface AddToCartPayload {
  productId?: string;
  product_id?: string;
  id?: string;
  quantity?: number;
  qty?: number;
  sessionId?: string;
  contextToken?: string;
  action?: "set" | "remove";
  cartItemId?: string;
  effectiveAccountId?: string;
}

export const addToCart = async (payload: AddToCartPayload) => {
  const productId = payload.productId || payload.product_id || payload.id || "";
  const quantity = payload.quantity || payload.qty || 1;
  const sessionId = payload.sessionId || payload.contextToken || "default";

  if (provider === "salesforce") {
    const action = payload?.action;

    if (action === "set") {
      return (salesforceCart as any).updateCartItem(payload.cartItemId, payload.quantity);
    }

    if (action === "remove") {
      return (salesforceCart as any).removeFromCart(payload.cartItemId);
    }

    return (salesforceCart as any).addToCartRequest({
      productId,
      quantity,
      effectiveAccountId: payload.effectiveAccountId,
    });
  }

  if (provider === "shopware") {
    return (shopwareCart as any).addToCart(productId, quantity, sessionId);
  }

  return (shopifyCart as any).addToCart(payload);
};

export const getCart = async (sessionId?: string) => {
  if (provider === "salesforce") {
    return (salesforceCart as any).getCart();
  }
  if (provider === "shopware") {
    return (shopwareCart as any).getCart(sessionId || "default");
  }
  return (shopifyCart as any).getCart();
};

export const updateCartItem = async (
  cartItemId: string,
  quantity?: number,
  sessionId?: string
) => {
  if (provider === "salesforce") {
    return (salesforceCart as any).updateCartItem(cartItemId, quantity);
  }
  if (provider === "shopware") {
    return (shopwareCart as any).updateCartItem(cartItemId, quantity, sessionId || "default");
  }
  return (shopifyCart as any).updateCartItem(cartItemId, quantity);
};

export const removeFromCart = async (cartItemId: string, sessionId?: string) => {
  if (provider === "salesforce") {
    return (salesforceCart as any).removeFromCart(cartItemId);
  }
  if (provider === "shopware") {
    return (shopwareCart as any).removeFromCart(cartItemId, sessionId || "default");
  }
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