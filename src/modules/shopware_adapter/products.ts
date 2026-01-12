import { shopwareClient } from "./client";
import { logger } from "../observability/logger";

function normalizeShopwareProduct(p: any) {
  return {
    productId: p.id,
    id: p.id,
    productName: p.translated?.name || p.name || "Product",
    title: p.translated?.name || p.name || "Product",
    name: p.translated?.name || p.name || "Product",
    description: p.translated?.description || p.description || "",
    unitPrice: p.calculatedPrice?.unitPrice ?? p.price?.[0]?.gross ?? 0,
    price: p.calculatedPrice?.unitPrice ?? p.price?.[0]?.gross ?? 0,
    currency: p.calculatedPrice?.currency?.isoCode || "EUR",
    imageUrl: p.cover?.media?.url ?? null,
    image: p.cover?.media?.url ?? null,
    productUrl: p.seoUrls?.[0]?.seoPathInfo
      ? `/${p.seoUrls[0].seoPathInfo}`
      : `/detail/${p.id}`,
    url: p.seoUrls?.[0]?.seoPathInfo
      ? `/${p.seoUrls[0].seoPathInfo}`
      : `/detail/${p.id}`,
    available: p.available ?? true,
    stock: p.stock ?? 0,
  };
}

export async function searchProducts(query: string, limit: number = 10) {
  try {
    const response = await shopwareClient.post("/search", {
      search: query,
      limit,
      associations: {
        cover: {
          associations: {
            media: {},
          },
        },
        seoUrls: {},
        categories: {},
        manufacturer: {},
      },
    });

    const elements = response.data.elements || [];
    logger.info("Products searched", { query, count: elements.length });

    return elements.map(normalizeShopwareProduct);
  } catch (error: any) {
    logger.error("Failed to search products", { error: error.message, query });
    return [];
  }
}

export async function getAllProducts(limit: number = 100, page: number = 1) {
  try {
    const response = await shopwareClient.post("/product", {
      limit,
      page,
      associations: {
        cover: {
          associations: {
            media: {},
          },
        },
        seoUrls: {},
      },
    });

    const elements = response.data.elements || [];
    return elements.map(normalizeShopwareProduct);
  } catch (error: any) {
    logger.error("Failed to get all products", { error: error.message });
    return [];
  }
}

export async function getProductDetails(productId: string) {
  try {
    const response = await shopwareClient.post(`/product/${productId}`, {
      associations: {
        cover: { associations: { media: {} } },
        seoUrls: {},
      },
    });

    const product = response.data.product || response.data;
    return normalizeShopwareProduct(product);
  } catch (error: any) {
    logger.error("Failed to get product details", { error: error.message, productId });
    return null;
  }
}

export async function getProductByHandle(handle: string) {
  try {
    const response = await shopwareClient.post("/product", {
      limit: 1,
      filter: [{ type: "equals", field: "productNumber", value: handle }],
      associations: {
        cover: { associations: { media: {} } },
        seoUrls: {},
      },
    });

    if (response.data.elements?.length > 0) {
      return normalizeShopwareProduct(response.data.elements[0]);
    }
    return null;
  } catch (error: any) {
    logger.error("Failed to get product by handle", { error: error.message, handle });
    return null;
  }
}

export default {
  searchProducts,
  getAllProducts,
  getProductDetails,
  getProductByHandle,
};