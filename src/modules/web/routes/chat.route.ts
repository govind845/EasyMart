import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { pythonAssistantClient } from "../../../utils/pythonClient";
import { searchProducts, addToCart, getCart } from "../../commerce_connector";
import { logger } from "../../observability/logger";

interface ChatRequestBody {
  message: string;
  sessionId?: string;
  session_id?: string;
}

export default async function chatRoute(app: FastifyInstance) {
  app.post(
    "/",
    async (
      req: FastifyRequest<{ Body: ChatRequestBody }>,
      reply: FastifyReply
    ) => {
      const { message } = req.body;
      const sessionId = req.body.sessionId || req.body.session_id || `guest-${Date.now()}`;

      if (!message || typeof message !== "string") {
        return reply
          .status(400)
          .send({ error: "message is required and must be a string" });
      }

      logger.info("Chat request received", {
        sessionId,
        messageLength: message.length,
      });

      try {
        const response = await pythonAssistantClient.sendMessage({
          message,
          sessionId,
        });

        const intent = response.context?.intent || response.intent;
        const query = response.context?.query || response.query || message;

        logger.info("Intent detected", { intent, query });

        // Handle search_products intent
        if (intent === "search_products") {
          try {
            const products = await searchProducts(query);

            logger.info("Products found", { count: products.length, query });

            if (products.length === 0) {
              return reply.send({
                replyText: `Sorry, I couldn't find any products for "${query}". Try a different search term.`,
                actions: [],
              });
            }

            return reply.send({
              replyText: response.replyText || `Here are some products for "${query}":`,
              actions: products.map((p: any) => ({
                type: "product_card",
                data: {
                  productId: p.id || p.productId,
                  title:
                    p.translated?.name ||
                    p.name ||
                    p.title ||
                    p.productName ||
                    "",
                  price:
                    p.calculatedPrice?.unitPrice ??
                    p.unitPrice ??
                    p.price ??
                    0,
                  currency:
                    p.calculatedPrice?.currency?.isoCode ||
                    p.currency ||
                    "EUR",
                  image:
                    p.cover?.media?.url ||
                    p.imageUrl ||
                    p.image ||
                    null,
                  url:
                    p.productUrl ||
                    p.url ||
                    `/detail/${p.id || p.productId}`,
                },
              })),
            });
          } catch (searchError: any) {
            logger.error("Product search failed", { error: searchError.message });
            return reply.send({
              replyText: "Sorry, I couldn't search for products right now. Please try again.",
              actions: [],
            });
          }
        }

        // Handle add_to_cart intent
        if (intent === "add_to_cart") {
          const productId = response.context?.productId;
          const quantity = response.context?.quantity || 1;

          if (productId) {
            try {
              const result = await addToCart({
                productId,
                quantity,
                sessionId,
              });

              if (result.success) {
                return reply.send({
                  replyText: response.replyText || "Added to cart successfully!",
                  actions: [
                    {
                      type: "cart_updated",
                      data: {
                        success: true,
                        totalItems: result.totalItems,
                        totalPrice: result.totalPrice,
                      },
                    },
                  ],
                });
              }
            } catch (cartError: any) {
              logger.error("Add to cart failed", { error: cartError.message });
            }
          }

          return reply.send({
            replyText: response.replyText || "Which product would you like to add to cart?",
            actions: [],
          });
        }

        // Handle view_cart intent
        if (intent === "view_cart") {
          try {
            const cart = await getCart(sessionId);
            return reply.send({
              replyText:
                response.replyText ||
                `You have ${cart.totalItems || 0} item(s) in your cart.`,
              actions: [
                {
                  type: "show_cart",
                  data: {
                    items: cart.items || [],
                    totalPrice: cart.totalPrice || 0,
                    totalItems: cart.totalItems || 0,
                  },
                },
              ],
            });
          } catch (cartError: any) {
            logger.error("Get cart failed", { error: cartError.message });
            return reply.send({
              replyText: "I couldn't retrieve your cart. Please try again.",
              actions: [],
            });
          }
        }

        // Default response
        logger.info("Chat response sent", { sessionId, intent });
        return reply.send({
          replyText: response.replyText || "I'm here to help! Try asking about products.",
          actions: response.actions || [],
        });
      } catch (error: any) {
        logger.error("Error calling Python assistant", {
          error: error.message,
          sessionId,
        });

        return reply.status(500).send({
          error: "Failed to process message",
          replyText: "Our assistant is temporarily unavailable. Please try again.",
        });
      }
    }
  );
}