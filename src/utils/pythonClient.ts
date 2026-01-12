import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from "axios";
import { config } from "../config";
import { logger } from "../modules/observability/logger";

interface AssistantRequest {
  message: string;
  sessionId: string;
}

interface AssistantContext {
  sessionId?: string;
  intent?: string;
  query?: string;
  productId?: string;
  quantity?: number;
  products?: any[];
}

interface AssistantResponse {
  replyText: string;
  message?: string;
  actions?: any[];
  context?: AssistantContext;
  intent?: string;
  query?: string;
}

class PythonAssistantClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.PYTHON_BASE_URL,
      timeout: 60000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        logger.info("Python API request", {
          url: config.url,
          baseURL: config.baseURL,
        });
        return config;
      },
      (error: AxiosError) => {
        logger.error("Python request setup error", { error: error.message });
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        logger.info("Python API response received", {
          status: response.status,
        });
        return response;
      },
      (error: AxiosError) => {
        const errorData = error.response?.data as { message?: string } | undefined;
        logger.error("Python API error", {
          status: error.response?.status,
          message: errorData?.message || error.message,
          url: error.config?.url,
        });
        return Promise.reject(error);
      }
    );
  }

  async sendMessage(request: AssistantRequest): Promise<AssistantResponse> {
    try {
      logger.info("Sending message to Python assistant", {
        sessionId: request.sessionId,
        messageLength: request.message.length,
      });

      const pythonRequest = {
        message: request.message,
        session_id: request.sessionId,
        sessionId: request.sessionId,
      };

      const response = await this.client.post<any>(
        "/assistant/message",
        pythonRequest
      );

      const data = response.data;

      // Extract intent from both possible formats
      const intent = data.context?.intent || data.intent;
      const query = data.context?.query || data.query;
      const replyText = data.replyText || data.message || "";

      logger.info("Assistant response received", {
        sessionId: request.sessionId,
        hasContext: !!data.context,
        intent: intent,
        query: query,
      });

      // Transform products if present (old format)
      const transformedProducts = (data.products || []).map((product: any) => ({
        id: product.id,
        title: product.name || product.title,
        price: product.price,
        image: product.image_url || product.image,
        url: product.url || `/products/${product.id}`,
        description: product.description,
      }));

      const transformedResponse: AssistantResponse = {
        replyText: replyText,
        message: data.message,
        actions: data.actions || [],
        context: {
          sessionId: data.session_id || request.sessionId,
          intent: intent,
          query: query,
          productId: data.context?.productId || data.productId,
          quantity: data.context?.quantity || data.quantity,
          products: transformedProducts.length > 0 ? transformedProducts : undefined,
        },
        intent: intent,
        query: query,
      };

      return transformedResponse;
    } catch (error: any) {
      logger.error("Failed to get assistant response", {
        sessionId: request.sessionId,
        error: error.message,
        status: error.response?.status,
      });

      if (error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT") {
        logger.warn("Python service unavailable, returning fallback");
        return {
          replyText: "I'm temporarily unavailable. Please try again in a moment.",
          context: {
            intent: undefined,
          },
        };
      }

      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get("/health", { timeout: 5000 });
      return response.status === 200;
    } catch (error) {
      logger.error("Python health check failed", { error });
      return false;
    }
  }

  async request<T = any>(method: string, endpoint: string, data?: any): Promise<{ data: T }> {
    try {
      const response = await this.client.request<T>({
        method,
        url: endpoint,
        data,
      });
      return { data: response.data };
    } catch (error) {
      logger.error(`Python ${method} ${endpoint} failed`, { error });
      throw error;
    }
  }
}

export const pythonAssistantClient = new PythonAssistantClient();