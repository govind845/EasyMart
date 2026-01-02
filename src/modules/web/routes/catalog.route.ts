import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { getAllProducts } from "../../../modules/commerce_connector";
import { logger } from "../../observability/logger";
import { config } from "../../../config";

interface NormalizedProduct {
  sku: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  tags: string[];
  image_url?: string;
  vendor: string;
  handle: string;
  product_url: string;
  specs?: Record<string, any>;
  stock_status?: string;
}

/**
 * Normalize Shopify product to internal catalog format
 */
function normalizeShopifyProduct(product: any): NormalizedProduct {
  const firstVariant = product.variants?.[0] || {};
  const firstImage = product.images?.[0];

  return {
    sku: firstVariant.sku || product.handle,
    title: product.title,
    description: product.body_html?.replace(/<[^>]*>/g, "") || "", // Strip HTML for main description
    price: parseFloat(firstVariant.price || "0"),
    currency: "AUD",
    category: product.product_type || "General",
    tags: product.tags ? product.tags.split(", ") : [],
    image_url: firstImage?.src,
    vendor: product.vendor || "EasyMart",
    handle: product.handle,
    product_url: `https://${config.SHOPIFY_STORE_DOMAIN}/products/${product.handle}`,
    stock_status: firstVariant.inventory_quantity > 0 ? "in_stock" : "out_of_stock",
    specs: {
      // Core dimensions
      weight: firstVariant.weight,
      weight_unit: firstVariant.weight_unit,
      inventory_quantity: firstVariant.inventory_quantity,
      barcode: firstVariant.barcode,

      // Extended fields
      specifications: product.body_html?.replace(/<[^>]*>/g, "") || "", // Map description to specifications for now
      features: product.tags, // Map tags to features
      material: product.options?.find((o: any) => o.name === "Material")?.values?.join(", "), // Try to find Material option

      // Full raw data for deep inspection if needed
      options: product.options,
      variants: product.variants,
      images: product.images,
      raw_body_html: product.body_html
    },
  };
}

export default async function catalogRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/internal/catalog/export
   * Export all products in normalized format for Python catalog indexer
   */
  fastify.get("/api/internal/catalog/export", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      logger.info("Catalog export requested");

      const allProducts = [];
      let sinceId: number | undefined = undefined;
      let hasMore = true;
      let pageCount = 0;
      const MAX_PAGES = 10; // Safety limit

      // Paginate through all products
      while (hasMore && pageCount < MAX_PAGES) {
        const products = await getAllProducts(250, sinceId);

        if (products.length === 0) {
          hasMore = false;
          break;
        }

        allProducts.push(...products);
          const last = products[products.length - 1];
          if ((config.COMMERCE_PROVIDER || "shopify").toLowerCase() === "salesforce") {
            sinceId = last?.productId || last?.Id || undefined;
          } else {
            sinceId = last?.id;
          }
        pageCount++;

        logger.info(`Fetched page ${pageCount}`, {
          productsInPage: products.length,
          totalSoFar: allProducts.length,
        });
      }

      // Normalize all products depending on provider
      const normalized = allProducts.map((p: any) => {
        if ((config.COMMERCE_PROVIDER || "shopify").toLowerCase() === "salesforce") {
          // Salesforce returns ProductDTO shape from Apex search
          return normalizeSalesforceProduct(p);
        }
        return normalizeShopifyProduct(p);
      });

      logger.info("Catalog export complete", {
        totalProducts: normalized.length,
        pagesProcessed: pageCount,
      });

      return reply.code(200).send(normalized);
    } catch (error: any) {
      logger.error("Catalog export failed (returning empty list for fallback)", { error: error.message });
      // Return empty list so consumer can fallback to other sources (e.g. local CSV)
      return reply.code(200).send([]);
    }
  });

  /**
   * GET /api/internal/catalog/stats
   * Get catalog statistics
   */
      fastify.get("/api/internal/catalog/stats", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const products = await getAllProducts(1);

      const sample = products[0];
      let sampleProduct: any = null;
      if (sample) {
        if ((config.COMMERCE_PROVIDER || "shopify").toLowerCase() === "salesforce") {
          sampleProduct = {
            id: sample.productId || sample.Id,
            title: sample.productName || sample.Name,
            handle: sample.productId || sample.Id,
          };
        } else {
          sampleProduct = {
            id: sample.id,
            title: sample.title,
            handle: sample.handle,
          };
        }
      }

      return reply.code(200).send({ status: "available", sample_product: sampleProduct });
    } catch (error: any) {
      logger.error("Catalog stats failed", { error: error.message });
      return reply.code(500).send({
        error: "Failed to get catalog stats",
        message: error.message,
      });
    }
  });

/**
 * Normalize Salesforce ProductDTO to internal catalog format
 */
function normalizeSalesforceProduct(product: any): NormalizedProduct {
  // product expected shape: { productId, productName, unitPrice, currencyIsoCode, imageUrl }
  return {
    sku: product.productId || product.Id || String(product.productId),
    title: product.productName || product.Name || "",
    description: "",
    price: product.unitPrice != null ? Number(product.unitPrice) : 0,
    currency: product.currencyIsoCode || "AUD",
    category: "General",
    tags: [],
    image_url: product.imageUrl || undefined,
    vendor: "EasyMart",
    handle: product.productId || product.Id || "",
    product_url: "",
    specs: {},
    stock_status: "unknown",
  };
}
}
