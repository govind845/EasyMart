import dotenv from "dotenv";

// Load environment variables
dotenv.config();

export const config = {
  // Server
  PORT: Number(process.env.PORT || 3000),
  NODE_ENV: process.env.NODE_ENV || "development",

  // Python Assistant API
  PYTHON_BASE_URL: process.env.PYTHON_BASE_URL || "http://localhost:8000",

  // Shopify credentials
  SHOPIFY_STORE_DOMAIN: (process.env.SHOPIFY_STORE_DOMAIN || "").replace(/^https?:\/\//, ""),
  SHOPIFY_ACCESS_TOKEN: process.env.SHOPIFY_ACCESS_TOKEN || "",
  SHOPIFY_API_VERSION: process.env.SHOPIFY_API_VERSION || "2024-01",

  // Session
  SESSION_SECRET: process.env.SESSION_SECRET || "easymart-secret-change-in-production",
  // Commerce provider (shopify | salesforce)
  COMMERCE_PROVIDER: process.env.COMMERCE_PROVIDER || "shopify",

  // Salesforce (Headless) configuration
  SALESFORCE_BASE_URL: (process.env.SALESFORCE_BASE_URL || "").replace(/\/$/, ""),
  SALESFORCE_TOKEN_URL: process.env.SALESFORCE_TOKEN_URL || "",
  SALESFORCE_CLIENT_ID: process.env.SALESFORCE_CLIENT_ID || "",
  SALESFORCE_CLIENT_SECRET: process.env.SALESFORCE_CLIENT_SECRET || "",
  SALESFORCE_USERNAME: process.env.SALESFORCE_USERNAME || "",
  SALESFORCE_PASSWORD: process.env.SALESFORCE_PASSWORD || "",
  SALESFORCE_SECURITY_TOKEN: process.env.SALESFORCE_SECURITY_TOKEN || "",
  // JWT Bearer Flow (server-to-server integration user)
    SALESFORCE_JWT_CLIENT_ID: process.env.SALESFORCE_JWT_CLIENT_ID || process.env.SALESFORCE_CLIENT_ID || "",
  SALESFORCE_JWT_USERNAME: process.env.SALESFORCE_JWT_USERNAME || process.env.SALESFORCE_USERNAME || "",
  // Private key for the Connected App (PEM). Can be multiline; dotenv may escape newlines.
  SALESFORCE_JWT_PRIVATE_KEY: process.env.SALESFORCE_JWT_PRIVATE_KEY || "",
  // Optional: server-side effective account id to use for cart operations
  SALESFORCE_EFFECTIVE_ACCOUNT_ID: process.env.SALESFORCE_EFFECTIVE_ACCOUNT_ID || "",
  SALESFORCE_API_VERSION: process.env.SALESFORCE_API_VERSION || "v57.0",

  
  // ✅ Shopware Store API (frontend / widget)
  SHOPWARE_STORE_API_URL: process.env.SHOPWARE_STORE_API_URL || "",

  // ✅ Shopware Admin API (catalog export)
  SHOPWARE_ADMIN_API_URL: process.env.SHOPWARE_ADMIN_API_URL || "",
  SHOPWARE_ADMIN_API_TOKEN: process.env.SHOPWARE_ADMIN_API_TOKEN || "",

  SHOPWARE_SALES_CHANNEL_KEY: process.env.SHOPWARE_SALES_CHANNEL_KEY || "",

};

// Validate required environment variables
const requiredEnvVars = ["SHOPIFY_STORE_DOMAIN", "SHOPIFY_ACCESS_TOKEN"];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar] && config.NODE_ENV === "production") {
    console.warn(`⚠️  Warning: ${envVar} is not set in environment variables`);
  }
}
