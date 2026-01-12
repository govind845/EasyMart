import { shopwareAdminClient } from "./adminClient";

/**
 * Get products using Admin API (full data)
 */
export async function getAllProducts(
  limit: number = 50,
  page: number = 1
) {
  const response = await shopwareAdminClient.post("/search/product", {
    limit,
    page,
    associations: {
      cover: {},
      media: {},
      categories: {},
      properties: {},
      manufacturer: {},
    },
  });

  return response.data.data || [];
}
