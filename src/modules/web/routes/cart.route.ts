import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { logger } from "../../observability/logger";
import { pythonAssistantClient } from "../../../utils/pythonClient";
import {
  addToCart as commerceAddToCart,
  getCart as commerceGetCart,
  updateCartItem as commerceUpdateCartItem,
  removeFromCart as commerceRemoveFromCart,
} from "../../commerce_connector";
import { config } from "../../../config";

interface CartRequestBody {
  productId?: string;
  product_id?: string;
  cartItemId?: string;
  lineItemId?: string;       // SHOPWARE: Preferred name for cart item ID
  line_item_id?: string;
  quantity?: number;
  action?: "add" | "remove" | "set";
  sessionId?: string;
  session_id?: string;
  contextToken?: string;     // SHOPWARE: Alternative name for session token
}

interface CartQuerystring {
  sessionId?: string;
  session_id?: string;
  contextToken?: string;     // SHOPWARE: Alternative name for session token
}

export default async function cartRoutes(fastify: FastifyInstance) {
  const provider = (config.COMMERCE_PROVIDER || "shopify").toLowerCase();

  fastify.post(
    "/api/cart/add",
    async (request: FastifyRequest<{ Body: CartRequestBody }>, reply: FastifyReply) => {
      try {
        const body = request.body || {};

        const productId = body.productId || body.product_id;
        const quantity = body.quantity || 1;
        const sessionId = body.sessionId || body.session_id || body.contextToken || "default";
        const action = body.action;
        const cartItemId = body.cartItemId || body.lineItemId || body.line_item_id;

        if ((!action || action === "add") && !productId) {
          return reply.code(400).send({
            success: false,
            error: "productId is required",
          });
        }

        if ((action === "set" || action === "remove") && !cartItemId) {
          return reply.code(400).send({
            success: false,
            error: "cartItemId is required for update/remove",
          });
        }

        logger.info("Adding to cart", { productId, quantity, sessionId, action, provider });

        // SHOPWARE: Handle add to cart via Store API
        if (provider === "shopware") {
          const result = await commerceAddToCart({
            productId,
            quantity,
            sessionId,  // SHOPWARE: Used for sw-context-token management
          });

          if (result.success) {
            return reply.send({
              success: true,
              message: "Product added to cart",
              cart: {
                id: result.cartId,
                items: result.items,
                totalPrice: result.totalPrice,
                totalItems: result.totalItems,
              },
              addedItem: result.addedItem,
            });
          } else {
            return reply.code(400).send({
              success: false,
              error: result.error || "Failed to add product to cart",
            });
          }
        }

        if (provider === "salesforce") {
          const effectiveAccountId = config.SALESFORCE_EFFECTIVE_ACCOUNT_ID || undefined;
          const payload: any = { productId, cartItemId, quantity, action };
          if (effectiveAccountId) payload.effectiveAccountId = effectiveAccountId;
          const resp = await commerceAddToCart(payload);
          return reply.send(resp);
        }

        const response = await pythonAssistantClient.request("POST", "/assistant/cart", {
          product_id: productId,
          quantity,
          action: action || "add",
          session_id: sessionId,
        });

        return reply.send(response.data);
      } catch (error: any) {
        logger.error("Cart add error:", error);
        return reply.code(500).send({
          success: false,
          error: error.message || "Failed to add to cart",
        });
      }
    }
  );

  fastify.get(
    "/api/cart",
    async (request: FastifyRequest<{ Querystring: CartQuerystring }>, reply: FastifyReply) => {
      try {
        const query = request.query || {};
        const sessionId = query.sessionId || query.session_id || query.contextToken || "default";

        logger.info("Getting cart", { sessionId, provider });

        // SHOPWARE: Get cart via Store API
        if (provider === "shopware") {
          const cart = await commerceGetCart(sessionId);
          return reply.send({
            success: true,
            cart: {
              id: cart.cartId,
              items: cart.items,
              totalPrice: cart.totalPrice,
              totalItems: cart.totalItems,
              currency: cart.currency || "EUR",  // SHOPWARE: Default currency
            },
          });
        }

        if (provider === "salesforce") {
          const resp = await commerceGetCart();
          return reply.send(resp);
        }

        const response = await pythonAssistantClient.request(
          "GET",
          `/assistant/cart?session_id=${sessionId}`
        );

        return reply.send({
          success: true,
          cart: response.data.cart || { items: [], item_count: 0, total: 0 },
        });
      } catch (error: any) {
        logger.error("Cart get error:", error);
        return reply.code(500).send({
          success: false,
          error: error.message || "Failed to get cart",
        });
      }
    }
  );

  fastify.put(
    "/api/cart/update",
    async (request: FastifyRequest<{ Body: CartRequestBody }>, reply: FastifyReply) => {
      try {
        const body = request.body || {};
        const lineItemId = body.lineItemId || body.line_item_id || body.cartItemId;
        const quantity = body.quantity;
        const sessionId = body.sessionId || body.session_id || body.contextToken || "default";

        if (!lineItemId || quantity === undefined) {
          return reply.code(400).send({
            success: false,
            error: "lineItemId and quantity are required",
          });
        }

        logger.info("Updating cart item", { lineItemId, quantity, sessionId });

        // SHOPWARE: Update line item quantity via PATCH endpoint
        if (provider === "shopware") {
          const result = await commerceUpdateCartItem(lineItemId, quantity, sessionId);
          return reply.send({
            success: true,
            message: "Cart updated",
            cart: {
              id: result.cartId,
              items: result.items,
              totalPrice: result.totalPrice,
              totalItems: result.totalItems,
            },
          });
        }

        const response = await pythonAssistantClient.request("POST", "/assistant/cart", {
          cartItemId: lineItemId,
          quantity,
          action: "set",
          session_id: sessionId,
        });

        return reply.send(response.data);
      } catch (error: any) {
        logger.error("Cart update error:", error);
        return reply.code(500).send({
          success: false,
          error: error.message || "Failed to update cart",
        });
      }
    }
  );

  fastify.delete(
    "/api/cart/remove",
    async (request: FastifyRequest<{ Body: CartRequestBody }>, reply: FastifyReply) => {
      try {
        const body = request.body || {};
        const lineItemId = body.lineItemId || body.line_item_id || body.cartItemId;
        const sessionId = body.sessionId || body.session_id || body.contextToken || "default";

        if (!lineItemId) {
          return reply.code(400).send({
            success: false,
            error: "lineItemId is required",
          });
        }

        logger.info("Removing from cart", { lineItemId, sessionId });

        // SHOPWARE: Remove line item via DELETE endpoint
        if (provider === "shopware") {
          const result = await commerceRemoveFromCart(lineItemId, sessionId);
          return reply.send({
            success: true,
            message: "Item removed from cart",
            cart: {
              id: result.cartId,
              items: result.items,
              totalPrice: result.totalPrice,
              totalItems: result.totalItems,
            },
          });
        }

        const response = await pythonAssistantClient.request("POST", "/assistant/cart", {
          cartItemId: lineItemId,
          action: "remove",
          session_id: sessionId,
        });

        return reply.send(response.data);
      } catch (error: any) {
        logger.error("Cart remove error:", error);
        return reply.code(500).send({
          success: false,
          error: error.message || "Failed to remove from cart",
        });
      }
    }
  );
}