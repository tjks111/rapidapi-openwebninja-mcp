import { OpenWebNinjaService } from '../services/openWebNinja.js';
import { validateSearchParams, sanitizeQuery, ValidationError } from '../utils/validation.js';
import { RateLimiter } from '../utils/rateLimiter.js';

/**
 * Handler for advanced web search tool with Google operators
 */
export class AdvancedSearchHandler {
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

      // Perform the advanced search
      const result = await this.apiService.advancedSearch(validatedParams);

      if (!result.success) {
        return {
          content: [{
            type: "text",
            text: `Advanced search failed: ${result.error?.message || 'Unknown error'}`
          }],
          isError: true
        };
      }

      if (!result.data || result.data.results.length === 0) {
        return {
          content: [{
            type: "text",
            text: `No results found for advanced search: "${this.buildSearchDescription(validatedParams)}"`
          }]
        };
      }

      // Format the results
      const formattedResults = this.formatAdvancedSearchResults(result.data, validatedParams);
      
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

  private buildSearchDescription(params: any): string {
    let description = params.query;
    const filters = [];
    
    if (params.site_restrict) {
      filters.push(`site:${params.site_restrict}`);
    }
    
    if (params.file_type) {
      filters.push(`filetype:${params.file_type}`);
    }
    
    if (params.date_range) {
      filters.push(`date range: ${params.date_range}`);
    }
    
    if (filters.length > 0) {
      description += ` (${filters.join(', ')})`;
    }
    
    return description;
  }

  private formatAdvancedSearchResults(data: any, params: any): string {
    const { results, query, total_results } = data;
    
    let output = `# Advanced Web Search Results\n\n`;
    
    // Show search parameters
    output += `## Search Parameters\n`;
    output += `- **Base Query:** "${params.query}"\n`;
    
    if (params.site_restrict) {
      output += `- **Site Restriction:** ${params.site_restrict}\n`;
    }
    
    if (params.file_type) {
      output += `- **File Type:** ${params.file_type}\n`;
    }
    
    if (params.date_range) {
      output += `- **Date Range:** ${params.date_range}\n`;
    }
    
    if (params.region) {
      output += `- **Region:** ${params.region}\n`;
    }
    
    output += `\n**Final Query:** "${query}"\n\n`;
    output += `Found ${total_results || results.length} results\n\n`;

    // Group results by domain if site restriction is used
    if (params.site_restrict) {
      output += `## Results from ${params.site_restrict}\n\n`;
    } else {
      output += `## Search Results\n\n`;
    }

    results.forEach((result: any, index: number) => {
      output += `### ${index + 1}. ${result.title}\n`;
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
      
      // Highlight file type if searching for specific types
      if (params.file_type && result.url) {
        const urlLower = result.url.toLowerCase();
        if (urlLower.includes(`.${params.file_type}`)) {
          output += `**File Type:** ${params.file_type.toUpperCase()} document\n`;
        }
      }
      
      output += `\n---\n\n`;
    });

    // Add search tips if no results
    if (results.length === 0) {
      output += `## Search Tips\n\n`;
      output += `- Try removing some filters to broaden your search\n`;
      output += `- Check spelling and try alternative keywords\n`;
      output += `- Use broader date ranges if using date filters\n`;
      output += `- Verify the site restriction domain is correct\n`;
    }

    // Add advanced search operators reference
    output += `\n## Advanced Search Operators Reference\n\n`;
    output += `- **site:domain.com** - Search within a specific website\n`;
    output += `- **filetype:pdf** - Find specific file types\n`;
    output += `- **intitle:keyword** - Find pages with keyword in title\n`;
    output += `- **inurl:keyword** - Find pages with keyword in URL\n`;
    output += `- **"exact phrase"** - Search for exact phrase\n`;
    output += `- **keyword1 OR keyword2** - Search for either term\n`;
    output += `- **keyword -exclude** - Exclude specific terms\n`;

    return output;
  }
}