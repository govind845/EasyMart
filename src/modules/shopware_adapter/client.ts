import axios from "axios";
import { config } from "../../config";
import { logger } from "../observability/logger";

/**
 * Shopware Store API client
 * Uses Sales Channel access key
 */
export const shopwareClient = axios.create({
  baseURL: config.SHOPWARE_STORE_API_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    "sw-access-key": config.SHOPWARE_SALES_CHANNEL_KEY,
  },
});

/* ---------- Logging ---------- */
shopwareClient.interceptors.request.use((req) => {
  logger.info("Shopware API request", {
    method: req.method,
    url: req.url,
  });
  return req;
});

shopwareClient.interceptors.response.use(
  (res) => res,
  (error) => {
    logger.error("Shopware API error", {
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
    });
    throw error;
  }
);
