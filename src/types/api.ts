// OpenWebNinja API Types
export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  position: number;
  domain?: string;
  favicon?: string;
  date?: string;
}

export interface WebSearchResponse {
  results: SearchResult[];
  total_results?: number;
  search_time?: number;
  query: string;
  region?: string;
}

export interface BulkSearchResponse {
  searches: {
    query: string;
    results: SearchResult[];
    total_results?: number;
  }[];
  search_time?: number;
}

export interface SearchParams {
  query: string;
  max_results?: number;
  region?: string;
  safe_search?: boolean;
  site_restrict?: string;
  file_type?: string;
  date_range?: string;
}

export interface BulkSearchParams {
  queries: string[];
  max_results_per_query?: number;
  region?: string;
  safe_search?: boolean;
}

export interface RapidAPIError {
  message: string;
  code?: string;
  status?: number;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: RapidAPIError;
  rate_limit?: {
    remaining: number;
    reset_time: number;
  };
}