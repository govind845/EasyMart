import { salesforceClient } from "./client";
import { logger } from "../observability/logger";

interface AddToCartRequest {
  productId: string;
  quantity: number;
  // effectiveAccountId must be controlled server-side (never from browser).
  effectiveAccountId?: string;
}

/**
 * Low-level: send an AddToCart request object to the Apex Cart API.
 * This preserves existing behavior for other internal callers.
 */
export async function addToCartRequest(req: AddToCartRequest): Promise<any> {
  try {
    logger.info("salesforce.addToCartRequest", { productId: req.productId, quantity: req.quantity });
    const { data } = await salesforceClient.post(`/services/apexrest/CartApi`, req);
    return data;
  } catch (error: any) {
    logger.error("Failed to add to Salesforce cart", { error: error.message });
    throw error;
  }
}

/**
 * High-level: add a product to cart by productId and quantity.
 * The server must supply `effectiveAccountId` when needed; do NOT accept it directly from browser input.
 */
export async function addToCart(productId: string, quantity: number, effectiveAccountId?: string): Promise<any> {
  const req: AddToCartRequest = { productId, quantity };
  if (effectiveAccountId) req.effectiveAccountId = effectiveAccountId;
  return addToCartRequest(req);
}

export async function getCart(): Promise<any> {
  try {
    logger.info("salesforce.getCart");
    const { data } = await salesforceClient.get(`/services/apexrest/CartApi`);
    return data;
  } catch (error: any) {
    logger.error("Failed to get Salesforce cart", { error: error.message });
    throw error;
  }
}

export async function updateCartItem(cartItemId: string, quantity?: number): Promise<any> {
  try {
    logger.info("salesforce.updateCartItem", { cartItemId, quantity });
    const body: any = { cartItemId };
    if (quantity != null) body.quantity = quantity;
    const { data } = await salesforceClient.patch(`/services/apexrest/CartApi`, body);
    return data;
  } catch (error: any) {
    logger.error("Failed to update Salesforce cart item", { error: error.message });
    throw error;
  }
}

export async function removeFromCart(cartItemId: string): Promise<any> {
  try {
    logger.info("salesforce.removeFromCart", { cartItemId });
    const { data } = await salesforceClient.delete(`/services/apexrest/CartApi`, { data: { cartItemId } });
    return data;
  } catch (error: any) {
    logger.error("Failed to remove Salesforce cart item", { error: error.message });
    throw error;
  }
}
