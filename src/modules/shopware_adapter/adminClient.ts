import axios from "axios";
import { config } from "../../config";
import { logger } from "../observability/logger";

export const shopwareAdminClient = axios.create({
  baseURL: config.SHOPWARE_ADMIN_API_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${config.SHOPWARE_ADMIN_API_TOKEN}`,
  },
});

/* Logging */
shopwareAdminClient.interceptors.request.use((req) => {
  logger.info("Shopware Admin API request", {
    method: req.method,
    url: req.url,
  });
  return req;
});

shopwareAdminClient.interceptors.response.use(
  (res) => res,
  (error) => {
    logger.error("Shopware Admin API error", {
      status: error.response?.status,
      data: error.response?.data,
    });
    throw error;
  }
);
