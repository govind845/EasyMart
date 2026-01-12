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

function normalizeShopifyProduct(product: any): NormalizedProduct {
  const firstVariant = product.variants?.[0] || {};
  const firstImage = product.images?.[0];

  return {
    sku: firstVariant.sku || product.handle,
    title: product.title,
    description: product.body_html?.replace(/<[^>]*>/g, "") || "",
    price: parseFloat(firstVariant.price || "0"),
    currency: "AUD",
    category: product.product_type || "General",
    tags: product.tags ? product.tags.split(", ") : [],
    image_url: firstImage?.src,
    vendor: product.vendor || "EasyMart",
    handle: product.handle,
    product_url: `https://${config.SHOPIFY_STORE_DOMAIN}/products/${product.handle}`,
    stock_status:
      firstVariant.inventory_quantity > 0 ? "in_stock" : "out_of_stock",
    specs: {
      weight: firstVariant.weight,
      weight_unit: firstVariant.weight_unit,
      inventory_quantity: firstVariant.inventory_quantity,
      barcode: firstVariant.barcode,
      specifications:
        product.body_html?.replace(/<[^>]*>/g, "") || "",
      features: product.tags,
      material: product.options
        ?.find((o: any) => o.name === "Material")
        ?.values?.join(", "),
      options: product.options,
      variants: product.variants,
      images: product.images,
      raw_body_html: product.body_html,
    },
  };
}

function normalizeShopwareProduct(product: any): NormalizedProduct {
  return {
    sku: product.productNumber,
    title: product.translated?.name || product.name || "",
    description: product.translated?.description || "",
    price:
      product.calculatedPrice?.unitPrice ??
      product.calculatedCheapestPrice?.unitPrice ??
      0,
    currency:
      product.calculatedPrice?.currency?.isoCode ||
      product.calculatedCheapestPrice?.currency?.isoCode ||
      "EUR",
    category: "General",
    tags: [],
    image_url: product.cover?.media?.url,
    vendor: product.manufacturer?.translated?.name || "EasyMart",
    handle: product.id,
    product_url: `/detail/${product.id}`,
    stock_status: product.available ? "in_stock" : "out_of_stock",
    specs: {
      weight: product.weight,
      width: product.width,
      height: product.height,
      length: product.length,
    },
  };
}

function normalizeSalesforceProduct(product: any): NormalizedProduct {
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

export default async function catalogRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/api/internal/catalog/export",
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        logger.info("Catalog export requested");

        const allProducts: any[] = [];
        let cursor: any = undefined;
        let page = 1;
        let hasMore = true;
        let pageCount = 0;
        const MAX_PAGES = 10;

        while (hasMore && pageCount < MAX_PAGES) {
          const products = await getAllProducts(250, cursor ?? page);

          if (!products || products.length === 0) {
            hasMore = false;
            break;
          }

          allProducts.push(...products);

          if (
            (config.COMMERCE_PROVIDER || "shopify").toLowerCase() ===
            "shopware"
          ) {
            page++;
          } else if (
            (config.COMMERCE_PROVIDER || "shopify").toLowerCase() ===
            "salesforce"
          ) {
            const last = products[products.length - 1];
            cursor = last?.productId || last?.Id;
          } else {
            const last = products[products.length - 1];
            cursor = last?.id;
          }

          pageCount++;
        }

        const normalized = allProducts.map((p: any) => {
          const provider = (
            config.COMMERCE_PROVIDER || "shopify"
          ).toLowerCase();

          if (provider === "salesforce") return normalizeSalesforceProduct(p);
          if (provider === "shopware") return normalizeShopwareProduct(p);
          return normalizeShopifyProduct(p);
        });

        return reply.code(200).send(normalized);
      } catch (error: any) {
        logger.error("Catalog export failed", { error: error.message });
        return reply.code(200).send([]);
      }
    }
  );

  fastify.get(
    "/api/internal/catalog/stats",
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const products = await getAllProducts(1);
        const sample = products?.[0] || null;

        let sampleProduct: any = null;

        if (sample) {
          const provider = (
            config.COMMERCE_PROVIDER || "shopify"
          ).toLowerCase();

          if (provider === "salesforce") {
            sampleProduct = {
              id: sample.productId || sample.Id,
              title: sample.productName || sample.Name,
              handle: sample.productId || sample.Id,
            };
          } else if (provider === "shopware") {
            sampleProduct = {
              id: sample.id,
              title: sample.translated?.name || sample.name,
              handle: sample.id,
            };
          } else {
            sampleProduct = {
              id: sample.id,
              title: sample.title,
              handle: sample.handle,
            };
          }
        }

        return reply
          .code(200)
          .send({ status: "available", sample_product: sampleProduct });
      } catch (error: any) {
        logger.error("Catalog stats failed", { error: error.message });
        return reply.code(500).send({
          error: "Failed to get catalog stats",
          message: error.message,
        });
      }
    }
  );
}
