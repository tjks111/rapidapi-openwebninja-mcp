import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { SearchParams, BulkSearchParams, WebSearchResponse, BulkSearchResponse, APIResponse, RapidAPIError } from '../types/api.js';

export class OpenWebNinjaService {
  private client: AxiosInstance;
  private apiKey: string;
  private baseURL = 'https://real-time-web-search.p.rapidapi.com';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': 'real-time-web-search.p.rapidapi.com',
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 second timeout
    });
  }

  /**
   * Perform a single web search
   */
  async search(params: SearchParams): Promise<APIResponse<WebSearchResponse>> {
    try {
      const searchParams = new URLSearchParams();
      searchParams.append('q', params.query);
      
      if (params.max_results) {
        searchParams.append('num', Math.min(params.max_results, 300).toString());
      }
      
      if (params.region) {
        searchParams.append('gl', params.region);
      }
      
      if (params.safe_search !== undefined) {
        searchParams.append('safe', params.safe_search ? 'active' : 'off');
      }

      const response: AxiosResponse = await this.client.get('/search', {
        params: Object.fromEntries(searchParams)
      });

      return {
        success: true,
        data: this.parseSearchResponse(response.data, params.query),
        rate_limit: this.extractRateLimit(response.headers)
      };
    } catch (error: any) {
      return {
        success: false,
        error: this.parseError(error)
      };
    }
  }

  /**
   * Perform bulk web searches
   */
  async bulkSearch(params: BulkSearchParams): Promise<APIResponse<BulkSearchResponse>> {
    try {
      const searches = [];
      
      for (const query of params.queries) {
        const searchResult = await this.search({
          query,
          max_results: params.max_results_per_query || 10,
          region: params.region,
          safe_search: params.safe_search
        });
        
        if (searchResult.success && searchResult.data) {
          searches.push({
            query,
            results: searchResult.data.results,
            total_results: searchResult.data.total_results
          });
        } else {
          // Include failed searches with empty results
          searches.push({
            query,
            results: [],
            total_results: 0
          });
        }
        
        // Add small delay between requests to respect rate limits
        if (params.queries.indexOf(query) < params.queries.length - 1) {
          await this.delay(100);
        }
      }

      return {
        success: true,
        data: {
          searches,
          search_time: Date.now()
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: this.parseError(error)
      };
    }
  }

  /**
   * Perform advanced search with operators
   */
  async advancedSearch(params: SearchParams): Promise<APIResponse<WebSearchResponse>> {
    let query = params.query;
    
    // Build advanced query with operators
    if (params.site_restrict) {
      query += ` site:${params.site_restrict}`;
    }
    
    if (params.file_type) {
      query += ` filetype:${params.file_type}`;
    }
    
    // Date range handling would need to be implemented based on API capabilities
    if (params.date_range) {
      // Note: This might need adjustment based on actual API parameters
      const dateParam = this.mapDateRange(params.date_range);
      if (dateParam) {
        query += ` ${dateParam}`;
      }
    }

    return this.search({
      ...params,
      query
    });
  }

  /**
   * Parse the API response into our standard format
   */
  private parseSearchResponse(data: any, originalQuery: string): WebSearchResponse {
    const results = [];
    
    if (data.data && Array.isArray(data.data)) {
      for (let i = 0; i < data.data.length; i++) {
        const item = data.data[i];
        results.push({
          title: item.title || '',
          url: item.url || '',
          snippet: item.snippet || '',
          position: i + 1,
          domain: item.domain,
          favicon: item.favicon,
          date: item.date
        });
      }
    }

    return {
      results,
      total_results: data.total_results || results.length,
      search_time: data.search_time || Date.now(),
      query: originalQuery
    };
  }

  /**
   * Parse error responses
   */
  private parseError(error: any): RapidAPIError {
    if (error.response) {
      return {
        message: error.response.data?.message || error.message || 'API request failed',
        code: error.response.data?.code || error.code,
        status: error.response.status
      };
    }
    
    return {
      message: error.message || 'Unknown error occurred',
      code: error.code
    };
  }

  /**
   * Extract rate limit information from response headers
   */
  private extractRateLimit(headers: any) {
    return {
      remaining: parseInt(headers['x-ratelimit-remaining'] || '0'),
      reset_time: parseInt(headers['x-ratelimit-reset'] || '0')
    };
  }

  /**
   * Map date range to query parameters
   */
  private mapDateRange(dateRange: string): string | null {
    const dateMap: Record<string, string> = {
      'past_day': 'after:1d',
      'past_week': 'after:1w', 
      'past_month': 'after:1m',
      'past_year': 'after:1y'
    };
    
    return dateMap[dateRange] || null;
  }

  /**
   * Simple delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Health check for the API
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.search({ query: 'test', max_results: 1 });
      return result.success;
    } catch {
      return false;
    }
  }
}