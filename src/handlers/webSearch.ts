import { OpenWebNinjaService } from '../services/openWebNinja.js';
import { validateSearchParams, sanitizeQuery, ValidationError } from '../utils/validation.js';
import { RateLimiter } from '../utils/rateLimiter.js';

/**
 * Handler for basic web search tool
 */
export class WebSearchHandler {
  private apiService: OpenWebNinjaService;
  private rateLimiter: RateLimiter;

  constructor(apiService: OpenWebNinjaService, rateLimiter: RateLimiter) {
    this.apiService = apiService;
    this.rateLimiter = rateLimiter;
  }

  async handle(params: any): Promise<any> {
    try {
      // Check rate limit
      if (!this.rateLimiter.canMakeRequest()) {
        const resetTime = this.rateLimiter.getTimeUntilReset();
        return {
          content: [{
            type: "text",
            text: `Rate limit exceeded. Please wait ${Math.ceil(resetTime / 1000)} seconds before making another request.`
          }],
          isError: true
        };
      }

      // Validate and sanitize input
      const validatedParams = validateSearchParams(params);
      validatedParams.query = sanitizeQuery(validatedParams.query);

      // Record the request
      this.rateLimiter.recordRequest();

      // Perform the search
      const result = await this.apiService.search(validatedParams);

      if (!result.success) {
        return {
          content: [{
            type: "text",
            text: `Search failed: ${result.error?.message || 'Unknown error'}`
          }],
          isError: true
        };
      }

      if (!result.data || result.data.results.length === 0) {
        return {
          content: [{
            type: "text",
            text: `No results found for query: "${validatedParams.query}"`
          }]
        };
      }

      // Format the results
      const formattedResults = this.formatSearchResults(result.data);
      
      return {
        content: [{
          type: "text",
          text: formattedResults
        }]
      };

    } catch (error) {
      if (error instanceof ValidationError) {
        return {
          content: [{
            type: "text",
            text: `Validation error: ${error.message}`
          }],
          isError: true
        };
      }

      return {
        content: [{
          type: "text",
          text: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  private formatSearchResults(data: any): string {
    const { results, query, total_results } = data;
    
    let output = `# Web Search Results for: "${query}"\n\n`;
    output += `Found ${total_results || results.length} results\n\n`;

    results.forEach((result: any, index: number) => {
      output += `## ${index + 1}. ${result.title}\n`;
      output += `**URL:** ${result.url}\n`;
      if (result.snippet) {
        output += `**Snippet:** ${result.snippet}\n`;
      }
      if (result.domain) {
        output += `**Domain:** ${result.domain}\n`;
      }
      if (result.date) {
        output += `**Date:** ${result.date}\n`;
      }
      output += `\n---\n\n`;
    });

    return output;
  }
}