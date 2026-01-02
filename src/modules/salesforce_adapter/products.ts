import { salesforceClient } from "./client";
import { logger } from "../observability/logger";
import { config } from "../../config";

export interface SalesforceProductDTO {
  productId: string;
  productName: string;
  unitPrice?: number;
  currencyIsoCode?: string;
  imageUrl?: string | null;
}

export async function searchProducts(query: string, limit = 10): Promise<SalesforceProductDTO[]> {
  try {
    logger.info("Salesforce searchProducts", { query, limit });
    const url = `/services/apexrest/commerce/search`;
    const body = { query, pageSize: Math.min(limit, 250) };
    const { data } = await salesforceClient.post(url, body);

    // Apex REST implements an admin-style search that returns product-like records.
    // Normalize results to a minimal DTO safe for the chat UI — avoid leaking Salesforce internals.
    const products = (data?.products || []) as any[];
    return products.map((p) => {
      const productId = p.productId || p.id || p.Id || p.Product2Id || p.product2Id;
      const productName = p.productName || p.name || p.Name || p.Product2Name || p.product2Name || "";
      const unitPrice = typeof p.unitPrice === "number" ? p.unitPrice : (p.unitPrice ? Number(p.unitPrice) : undefined) || (p.price ? Number(p.price) : undefined);
      const currencyIsoCode = p.currencyIsoCode || p.currency || p.CurrencyIsoCode || undefined;

      // Intentionally do not return internal image URLs. Frontend should not access Salesforce resources directly.
      return {
        productId,
        productName,
        unitPrice,
        currencyIsoCode,
        imageUrl: null,
      } as SalesforceProductDTO;
    });
  } catch (error: any) {
    logger.error("Failed to search Salesforce products", { error: error.message });
    throw error;
  }
}

export async function getAllProducts(limit = 50, _cursor?: any): Promise<SalesforceProductDTO[]> {
  // Apex sample doesn't provide a full export endpoint; use search with a wildcard-ish query
  try {
    logger.info("Salesforce getAllProducts", { limit });
    const products = await searchProducts("Alpine", limit);
    return products;
  } catch (error: any) {
    logger.error("Failed to get all Salesforce products", { error: error.message });
    throw error;
  }
}

export async function getProductDetails(productId: string): Promise<any | null> {
  try {
    logger.info("Salesforce getProductDetails", { productId });
    const apiVersion = config.SALESFORCE_API_VERSION || "v57.0";
    const { data } = await salesforceClient.get(`/services/data/${apiVersion}/sobjects/Product2/${productId}`);
    return data || null;
  } catch (error: any) {
    logger.error("Failed to get Salesforce product details", { productId, error: error.message });
    if (error.response?.status === 404) return null;
    throw error;
  }
}

export async function getProductByHandle(handle: string): Promise<any | null> {
  try {
    // No direct handle support in sample; try searching by handle string
    const products = await searchProducts(handle, 1);
    return products[0] || null;
  } catch (error: any) {
    logger.error("Failed to get Salesforce product by handle", { handle, error: error.message });
    throw error;
  }
}
