import axios, { AxiosInstance } from "axios";
import jwt from "jsonwebtoken";
// Using URLSearchParams to avoid external dependency on 'qs'
import { config } from "../../config";
import { logger } from "../observability/logger";

class SalesforceClient {
  private client: AxiosInstance | null = null;
  private accessToken: string | null = null;
  private expiry: number = 0;

  constructor() {
    if (!config.SALESFORCE_BASE_URL) {
      logger.warn("Salesforce base URL not configured");
    }

    this.client = axios.create({
      baseURL: config.SALESFORCE_BASE_URL || "",
      timeout: 10000,
      headers: { "Content-Type": "application/json" },
    });

    this.client.interceptors.request.use(async (req) => {
      try {
        const token = await this.getAccessToken();
        if (token) {
          req.headers = req.headers || {};
          req.headers["Authorization"] = `Bearer ${token}`;
        }
      } catch (err: any) {
        logger.error("Failed to attach access token to Salesforce request", { error: err?.message ?? err });
      }

      // Log outgoing requests (redact Authorization header)
      try {
        const safeHeaders = { ...(req.headers as Record<string, any>) };
        if (safeHeaders.Authorization) safeHeaders.Authorization = "REDACTED";
        logger.info("SF REQ", { method: req.method, url: req.url, headers: safeHeaders, data: req.data ? String(req.data).slice(0, 1000) : undefined });
      } catch (logErr) {
        logger.warn("Failed to log Salesforce request", { error: (logErr as Error).message });
      }

      return req;
    });

    this.client.interceptors.response.use(
      (res) => {
        try {
          logger.info("SF RES", { status: res.status, url: res.config?.url, data: res.data ? JSON.stringify(res.data).slice(0, 1000) : undefined });
        } catch (logErr) {
          logger.warn("Failed to log Salesforce response", { error: (logErr as Error).message });
        }
        return res;
      },
      (error) => {
        try {
          logger.error("Salesforce API error", {
            status: error.response?.status,
            url: error.config?.url,
            data: error.response?.data,
            message: error.message,
          });
        } catch (logErr) {
          logger.error("Failed to log Salesforce API error", { error: (logErr as Error).message });
        }
        return Promise.reject(error);
      }
    );
  }

  getClient(): AxiosInstance {
    if (!this.client) {
      this.client = axios.create({ baseURL: config.SALESFORCE_BASE_URL || "" });
    }
    return this.client;
  }

  private async fetchTokenWithPasswordGrant(): Promise<void> {
    if (!config.SALESFORCE_TOKEN_URL) throw new Error("SALESFORCE_TOKEN_URL not configured");
    if (!config.SALESFORCE_CLIENT_ID || !config.SALESFORCE_CLIENT_SECRET) throw new Error("Salesforce client credentials missing");

    const password = config.SALESFORCE_PASSWORD || "";
    const username = config.SALESFORCE_USERNAME || "";
    const security = config.SALESFORCE_SECURITY_TOKEN || "";

    const params = new URLSearchParams();
    params.append("grant_type", "password");
    params.append("client_id", config.SALESFORCE_CLIENT_ID);
    params.append("client_secret", config.SALESFORCE_CLIENT_SECRET);
    params.append("username", username);
    params.append("password", `${password}${security}`);

    const resp = await axios.post(config.SALESFORCE_TOKEN_URL, params.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    const data = resp.data;
    this.accessToken = data.access_token;
    this.expiry = Date.now() + (data.expires_in || 3600) * 1000 - 10000; // 10s leeway
  }

  private async fetchTokenWithJWT(): Promise<void> {
    if (!config.SALESFORCE_TOKEN_URL) throw new Error("SALESFORCE_TOKEN_URL not configured");
    const clientId = config.SALESFORCE_JWT_CLIENT_ID || config.SALESFORCE_CLIENT_ID;
    const username = config.SALESFORCE_JWT_USERNAME || config.SALESFORCE_USERNAME;
    const privateKeyRaw = config.SALESFORCE_JWT_PRIVATE_KEY;

    if (!clientId || !username || !privateKeyRaw) {
      throw new Error("Salesforce JWT configuration missing (SALESFORCE_JWT_CLIENT_ID / SALESFORCE_JWT_USERNAME / SALESFORCE_JWT_PRIVATE_KEY)");
    }

    // dotenv often stores multi-line PEM with escaped newlines; normalize
    const privateKey = privateKeyRaw.includes("\\n") ? privateKeyRaw.replace(/\\n/g, "\n") : privateKeyRaw;

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: clientId,
      sub: username,
      aud: config.SALESFORCE_TOKEN_URL,
      iat: now,
      exp: now + 180, // short-lived assertion
    };

    const signed = jwt.sign(payload, privateKey, { algorithm: "RS256" });

    const params = new URLSearchParams();
    params.append("grant_type", "urn:ietf:params:oauth:grant-type:jwt-bearer");
    params.append("assertion", signed);

    const resp = await axios.post(config.SALESFORCE_TOKEN_URL, params.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    const data = resp.data;
    this.accessToken = data.access_token;
    this.expiry = Date.now() + (data.expires_in || 3600) * 1000 - 10000; // 10s leeway
  }

  private async getAccessToken(): Promise<string | null> {
    if (this.accessToken && Date.now() < this.expiry) return this.accessToken;

    // Prefer JWT Bearer Flow when configured
    if (config.SALESFORCE_JWT_PRIVATE_KEY && (config.SALESFORCE_JWT_CLIENT_ID || config.SALESFORCE_CLIENT_ID)) {
      await this.fetchTokenWithJWT();
      return this.accessToken;
    }

    // Fallback to password grant if explicitly provided (useful for local/dev only)
    if (config.SALESFORCE_USERNAME && config.SALESFORCE_PASSWORD) {
      logger.warn("Using Salesforce password grant flow as a fallback (not recommended for production)");
      await this.fetchTokenWithPasswordGrant();
      return this.accessToken;
    }

    throw new Error("No supported Salesforce auth configured (set JWT vars or username/password)");
  }
}

export const salesforceClient = new SalesforceClient().getClient();
