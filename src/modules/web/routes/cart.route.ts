import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../../../modules/observability/logger';
import { pythonAssistantClient } from '../../../utils/pythonClient';
import { addToCart as commerceAddToCart, getCart as commerceGetCart } from '../../../modules/commerce_connector';
import { config } from '../../../config';

interface CartRequestBody {
  product_id?: string;
  cartItemId?: string;
  quantity?: number;
  action?: 'add' | 'remove' | 'set';
  session_id: string;
}

interface CartQuerystring {
  session_id: string;
}

export default async function cartRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/cart/add
   * Add item to cart
   */
  fastify.post('/api/cart/add', async (request: FastifyRequest<{ Body: CartRequestBody }>, reply: FastifyReply) => {
    try {
      const { product_id, quantity = 1, session_id, action } = request.body;

      // if (!product_id || !session_id) {
      //   return reply.code(400).send({
      //     success: false,
      //     error: 'product_id and session_id are required'
      //   });
      // }
      if (!session_id) {
        return reply.code(400).send({
          success: false,
          error: 'session_id is required'
        });
      }

      // ADD
      if ((!action || action === 'add') && !product_id) {
        return reply.code(400).send({
          success: false,
          error: 'product_id is required for add'
        });
      }

      // UPDATE / DELETE
      if ((action === 'set' || action === 'remove') && !request.body.cartItemId) {
        return reply.code(400).send({
          success: false,
          error: 'cartItemId is required for update/remove'
        });
      }

      logger.info('Adding to cart', { product_id, quantity, session_id, action });

      // Route to Salesforce/Shopify commerce connector when configured
      if ((config.COMMERCE_PROVIDER || 'shopify').toLowerCase() === 'salesforce') {
        // Use server-side effectiveAccountId if provided; do NOT accept from browser
        const effectiveAccountId = config.SALESFORCE_EFFECTIVE_ACCOUNT_ID || undefined;

        const payload: any = {
          productId: product_id,
          cartItemId: request.body.cartItemId,
          quantity,
          action,
        };
        // {
        //   productId: product_id,
        //   quantity,
        // };
        if (effectiveAccountId) payload.effectiveAccountId = effectiveAccountId;

        const resp = await commerceAddToCart(payload);
        return reply.send(resp);
      }

      // Forward to Python backend (default/legacy flow)
      const response = await pythonAssistantClient.request(
        'POST',
        '/assistant/cart',
        {
          product_id,
          quantity,
          action: action || 'add',
          session_id,
        }
      );

      return reply.send(response.data);
    } catch (error: any) {
      logger.error('Cart add error:', error);
      return reply.code(500).send({
        success: false,
        error: error.message || 'Failed to add to cart'
      });
    }
  });

  /**
   * GET /api/cart
   * Get cart contents
   */
  fastify.get('/api/cart', async (request: FastifyRequest<{ Querystring: CartQuerystring }>, reply: FastifyReply) => {
    try {
      const { session_id } = request.query;

      if (!session_id) {
        return reply.code(400).send({
          success: false,
          error: 'session_id is required'
        });
      }

      // If using Salesforce as the commerce provider, route to commerce connector
      if ((config.COMMERCE_PROVIDER || 'shopify').toLowerCase() === 'salesforce') {
        const resp = await commerceGetCart();
        return reply.send(resp);
      }

      // Get cart from Python backend using direct GET endpoint (legacy/default)
      const response = await pythonAssistantClient.request('GET', `/assistant/cart?session_id=${session_id}`);

      return reply.send({
        success: true,
        cart: response.data.cart || { items: [], item_count: 0, total: 0 },
      });
    } catch (error: any) {
      logger.error('Cart get error:', error);
      return reply.code(500).send({
        success: false,
        error: error.message || 'Failed to get cart'
      });
    }
  });
}
