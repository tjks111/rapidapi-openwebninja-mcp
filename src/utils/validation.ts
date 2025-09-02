import { SearchParams, BulkSearchParams } from '../types/api.js';

/**
 * Validation utilities for MCP tool inputs
 */

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validate web search parameters
 */
export function validateSearchParams(params: any): SearchParams {
  if (!params || typeof params !== 'object') {
    throw new ValidationError('Parameters must be an object');
  }

  if (!params.query || typeof params.query !== 'string') {
    throw new ValidationError('Query is required and must be a string', 'query');
  }

  if (params.query.trim().length === 0) {
    throw new ValidationError('Query cannot be empty', 'query');
  }

  if (params.query.length > 500) {
    throw new ValidationError('Query cannot exceed 500 characters', 'query');
  }

  const validated: SearchParams = {
    query: params.query.trim()
  };

  // Validate max_results
  if (params.max_results !== undefined) {
    if (typeof params.max_results !== 'number' || !Number.isInteger(params.max_results)) {
      throw new ValidationError('max_results must be an integer', 'max_results');
    }
    if (params.max_results < 1 || params.max_results > 300) {
      throw new ValidationError('max_results must be between 1 and 300', 'max_results');
    }
    validated.max_results = params.max_results;
  }

  // Validate region
  if (params.region !== undefined) {
    if (typeof params.region !== 'string') {
      throw new ValidationError('region must be a string', 'region');
    }
    if (!/^[a-z]{2}$/.test(params.region)) {
      throw new ValidationError('region must be a 2-letter country code', 'region');
    }
    validated.region = params.region.toLowerCase();
  }

  // Validate safe_search
  if (params.safe_search !== undefined) {
    if (typeof params.safe_search !== 'boolean') {
      throw new ValidationError('safe_search must be a boolean', 'safe_search');
    }
    validated.safe_search = params.safe_search;
  }

  // Validate site_restrict
  if (params.site_restrict !== undefined) {
    if (typeof params.site_restrict !== 'string') {
      throw new ValidationError('site_restrict must be a string', 'site_restrict');
    }
    if (params.site_restrict.trim().length === 0) {
      throw new ValidationError('site_restrict cannot be empty', 'site_restrict');
    }
    validated.site_restrict = params.site_restrict.trim();
  }

  // Validate file_type
  if (params.file_type !== undefined) {
    if (typeof params.file_type !== 'string') {
      throw new ValidationError('file_type must be a string', 'file_type');
    }
    const allowedTypes = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'rtf'];
    if (!allowedTypes.includes(params.file_type.toLowerCase())) {
      throw new ValidationError(`file_type must be one of: ${allowedTypes.join(', ')}`, 'file_type');
    }
    validated.file_type = params.file_type.toLowerCase();
  }

  // Validate date_range
  if (params.date_range !== undefined) {
    if (typeof params.date_range !== 'string') {
      throw new ValidationError('date_range must be a string', 'date_range');
    }
    const allowedRanges = ['past_day', 'past_week', 'past_month', 'past_year'];
    if (!allowedRanges.includes(params.date_range)) {
      throw new ValidationError(`date_range must be one of: ${allowedRanges.join(', ')}`, 'date_range');
    }
    validated.date_range = params.date_range;
  }

  return validated;
}

/**
 * Validate bulk search parameters
 */
export function validateBulkSearchParams(params: any): BulkSearchParams {
  if (!params || typeof params !== 'object') {
    throw new ValidationError('Parameters must be an object');
  }

  if (!params.queries || !Array.isArray(params.queries)) {
    throw new ValidationError('queries is required and must be an array', 'queries');
  }

  if (params.queries.length === 0) {
    throw new ValidationError('queries array cannot be empty', 'queries');
  }

  if (params.queries.length > 20) {
    throw new ValidationError('queries array cannot exceed 20 items', 'queries');
  }

  // Validate each query
  const validatedQueries: string[] = [];
  for (let i = 0; i < params.queries.length; i++) {
    const query = params.queries[i];
    if (typeof query !== 'string') {
      throw new ValidationError(`Query at index ${i} must be a string`, 'queries');
    }
    if (query.trim().length === 0) {
      throw new ValidationError(`Query at index ${i} cannot be empty`, 'queries');
    }
    if (query.length > 500) {
      throw new ValidationError(`Query at index ${i} cannot exceed 500 characters`, 'queries');
    }
    validatedQueries.push(query.trim());
  }

  const validated: BulkSearchParams = {
    queries: validatedQueries
  };

  // Validate max_results_per_query
  if (params.max_results_per_query !== undefined) {
    if (typeof params.max_results_per_query !== 'number' || !Number.isInteger(params.max_results_per_query)) {
      throw new ValidationError('max_results_per_query must be an integer', 'max_results_per_query');
    }
    if (params.max_results_per_query < 1 || params.max_results_per_query > 50) {
      throw new ValidationError('max_results_per_query must be between 1 and 50', 'max_results_per_query');
    }
    validated.max_results_per_query = params.max_results_per_query;
  }

  // Validate region
  if (params.region !== undefined) {
    if (typeof params.region !== 'string') {
      throw new ValidationError('region must be a string', 'region');
    }
    if (!/^[a-z]{2}$/.test(params.region)) {
      throw new ValidationError('region must be a 2-letter country code', 'region');
    }
    validated.region = params.region.toLowerCase();
  }

  // Validate safe_search
  if (params.safe_search !== undefined) {
    if (typeof params.safe_search !== 'boolean') {
      throw new ValidationError('safe_search must be a boolean', 'safe_search');
    }
    validated.safe_search = params.safe_search;
  }

  return validated;
}

/**
 * Sanitize query string to prevent injection attacks
 */
export function sanitizeQuery(query: string): string {
  // Remove potentially dangerous characters while preserving search operators
  return query
    .replace(/[<>"']/g, '') // Remove HTML/script injection chars
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Validate environment variables
 */
export function validateEnvironment(): void {
  if (!process.env.RAPIDAPI_KEY) {
    throw new ValidationError('RAPIDAPI_KEY environment variable is required');
  }

  if (process.env.RAPIDAPI_KEY.length < 10) {
    throw new ValidationError('RAPIDAPI_KEY appears to be invalid (too short)');
  }
}