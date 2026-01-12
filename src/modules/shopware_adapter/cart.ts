import { shopwareClient } from "./client";
import { logger } from "../observability/logger";

const contextTokens = new Map<string, string>();

function getContextToken(sessionId: string = "default"): string | undefined {
  if (sessionId && sessionId.length === 32 && /^[a-f0-9]+$/i.test(sessionId)) {
    return sessionId;
  }
  return contextTokens.get(sessionId);
}

function setContextToken(sessionId: string, token: string): void {
  contextTokens.set(sessionId, token);
}

function getHeaders(sessionId?: string): Record<string, string> {
  const token = getContextToken(sessionId || "default");
  return token ? { "sw-context-token": token } : {};
}

function handleContextToken(response: any, sessionId: string = "default"): string | undefined {
  const token = response.headers?.["sw-context-token"];
  if (token) {
    setContextToken(sessionId, token);
    return token;
  }
  return undefined;
}

export async function getCart(sessionId: string = "default") {
  try {
    const response = await shopwareClient.get("/checkout/cart", {
      headers: getHeaders(sessionId),
    });

    handleContextToken(response, sessionId);
    const cart = response.data;

    return {
      success: true,
      cartId: cart.token,
      items: (cart.lineItems || []).map(normalizeCartItem),
      totalPrice: cart.price?.totalPrice ?? 0,
      totalItems: cart.lineItems?.length ?? 0,
      currency: cart.price?.currencyId || "EUR",
    };
  } catch (error: any) {
    if (error.response?.status === 404) {
      return createCart(sessionId);
    }
    logger.error("Failed to get cart", { error: error.message });
    throw error;
  }
}

export async function createCart(sessionId: string = "default") {
  try {
    const response = await shopwareClient.post(
      "/checkout/cart",
      {},
      { headers: getHeaders(sessionId) }
    );

    handleContextToken(response, sessionId);

    return {
      success: true,
      cartId: response.data.token,
      items: [],
      totalPrice: 0,
      totalItems: 0,
      currency: "EUR",
    };
  } catch (error: any) {
    logger.error("Failed to create cart", { error: error.message });
    throw error;
  }
}

export async function addToCart(
  productId: string,
  quantity: number = 1,
  sessionId: string = "default"
) {
  try {
    await getCart(sessionId);

    const response = await shopwareClient.post(
      "/checkout/cart/line-item",
      {
        items: [
          {
            id: productId,
            referencedId: productId,
            type: "product",
            quantity: quantity,
          },
        ],
      },
      { headers: getHeaders(sessionId) }
    );

    handleContextToken(response, sessionId);
    const cart = response.data;

    logger.info("Product added to cart", { productId, quantity });

    return {
      success: true,
      cartId: cart.token,
      items: (cart.lineItems || []).map(normalizeCartItem),
      totalPrice: cart.price?.totalPrice ?? 0,
      totalItems: cart.lineItems?.length ?? 0,
      addedItem: findCartItem(cart.lineItems, productId),
    };
  } catch (error: any) {
    logger.error("Failed to add to cart", { error: error.message, productId });

    return {
      success: false,
      error:
        error.response?.data?.errors?.[0]?.detail ||
        error.message ||
        "Failed to add product to cart",
      productId,
    };
  }
}

export async function updateCartItem(
  lineItemId: string,
  quantity: number,
  sessionId: string = "default"
) {
  try {
    const response = await shopwareClient.patch(
      "/checkout/cart/line-item",
      {
        items: [{ id: lineItemId, quantity }],
      },
      { headers: getHeaders(sessionId) }
    );

    handleContextToken(response, sessionId);
    const cart = response.data;

    return {
      success: true,
      cartId: cart.token,
      items: (cart.lineItems || []).map(normalizeCartItem),
      totalPrice: cart.price?.totalPrice ?? 0,
      totalItems: cart.lineItems?.length ?? 0,
    };
  } catch (error: any) {
    logger.error("Failed to update cart", { error: error.message });
    throw error;
  }
}

export async function removeFromCart(
  lineItemId: string,
  sessionId: string = "default"
) {
  try {
    const response = await shopwareClient.delete(
      `/checkout/cart/line-item?ids[]=${lineItemId}`,
      { headers: getHeaders(sessionId) }
    );

    handleContextToken(response, sessionId);
    const cart = response.data;

    return {
      success: true,
      cartId: cart.token,
      items: (cart.lineItems || []).map(normalizeCartItem),
      totalPrice: cart.price?.totalPrice ?? 0,
      totalItems: cart.lineItems?.length ?? 0,
    };
  } catch (error: any) {
    logger.error("Failed to remove from cart", { error: error.message });
    throw error;
  }
}

function normalizeCartItem(item: any) {
  return {
    id: item.id,
    productId: item.referencedId || item.productId,
    name: item.label || "Product",
    quantity: item.quantity || 1,
    unitPrice: item.price?.unitPrice ?? 0,
    totalPrice: item.price?.totalPrice ?? 0,
    imageUrl: item.cover?.url || null,
  };
}

function findCartItem(lineItems: any[], productId: string) {
  if (!lineItems) return null;
  const item = lineItems.find(
    (li: any) => li.referencedId === productId || li.productId === productId
  );
  return item ? normalizeCartItem(item) : null;
}

export default {
  getCart,
  createCart,
  addToCart,
  updateCartItem,
  removeFromCart,
};