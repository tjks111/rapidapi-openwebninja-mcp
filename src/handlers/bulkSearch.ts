import { OpenWebNinjaService } from '../services/openWebNinja.js';
import { validateBulkSearchParams, sanitizeQuery, ValidationError } from '../utils/validation.js';
import { RateLimiter } from '../utils/rateLimiter.js';

/**
 * Handler for bulk web search tool
 */
export class BulkSearchHandler {
  private apiService: OpenWebNinjaService;
  private rateLimiter: RateLimiter;

  constructor(apiService: OpenWebNinjaService, rateLimiter: RateLimiter) {
    this.apiService = apiService;
    this.rateLimiter = rateLimiter;
  }

  async handle(params: any): Promise<any> {
    try {
      // Check rate limit (bulk searches count as multiple requests)
      const estimatedRequests = params.queries?.length || 1;
      if (this.rateLimiter.getCurrentCount() + estimatedRequests > 100) {
        const resetTime = this.rateLimiter.getTimeUntilReset();
        return {
          content: [{
            type: "text",
            text: `Rate limit would be exceeded with ${estimatedRequests} requests. Please wait ${Math.ceil(resetTime / 1000)} seconds or reduce the number of queries.`
          }],
          isError: true
        };
      }

      // Validate and sanitize input
      const validatedParams = validateBulkSearchParams(params);
      validatedParams.queries = validatedParams.queries.map(query => sanitizeQuery(query));

      // Perform the bulk search
      const result = await this.apiService.bulkSearch(validatedParams);

      if (!result.success) {
        return {
          content: [{
            type: "text",
            text: `Bulk search failed: ${result.error?.message || 'Unknown error'}`
          }],
          isError: true
        };
      }

      if (!result.data || result.data.searches.length === 0) {
        return {
          content: [{
            type: "text",
            text: "No search results returned from bulk search"
          }]
        };
      }

      // Format the results
      const formattedResults = this.formatBulkSearchResults(result.data);
      
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

  private formatBulkSearchResults(data: any): string {
    const { searches } = data;
    
    let output = `# Bulk Web Search Results\n\n`;
    output += `Processed ${searches.length} queries\n\n`;

    searches.forEach((search: any, searchIndex: number) => {
      output += `## Query ${searchIndex + 1}: "${search.query}"\n\n`;
      
      if (search.results.length === 0) {
        output += `*No results found*\n\n`;
      } else {
        output += `Found ${search.total_results || search.results.length} results\n\n`;
        
        // Show top 3 results for each query to keep output manageable
        const topResults = search.results.slice(0, 3);
        
        topResults.forEach((result: any, index: number) => {
          output += `### ${index + 1}. ${result.title}\n`;
          output += `**URL:** ${result.url}\n`;
          if (result.snippet) {
            output += `**Snippet:** ${result.snippet.substring(0, 150)}${result.snippet.length > 150 ? '...' : ''}\n`;
          }
          if (result.domain) {
            output += `**Domain:** ${result.domain}\n`;
          }
          output += `\n`;
        });
        
        if (search.results.length > 3) {
          output += `*... and ${search.results.length - 3} more results*\n\n`;
        }
      }
      
      output += `---\n\n`;
    });

    // Add summary
    const totalResults = searches.reduce((sum: number, search: any) => sum + search.results.length, 0);
    output += `## Summary\n\n`;
    output += `- **Total Queries:** ${searches.length}\n`;
    output += `- **Total Results:** ${totalResults}\n`;
    output += `- **Successful Queries:** ${searches.filter((s: any) => s.results.length > 0).length}\n`;
    output += `- **Failed Queries:** ${searches.filter((s: any) => s.results.length === 0).length}\n`;

    return output;
  }
}