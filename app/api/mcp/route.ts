import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { NextRequest, NextResponse } from 'next/server';

// Import our existing handlers and services
import { OpenWebNinjaService } from '../../../src/services/openWebNinja';
import { RateLimiter } from '../../../src/utils/rateLimiter';
import { validateSearchParams, validateBulkSearchParams, ValidationError } from '../../../src/utils/validation';

// Initialize services
let apiService: OpenWebNinjaService;
let rateLimiter: RateLimiter;

function initializeServices() {
  if (!apiService) {
    if (!process.env.RAPIDAPI_KEY) {
      throw new Error('RAPIDAPI_KEY environment variable is required');
    }
    apiService = new OpenWebNinjaService(process.env.RAPIDAPI_KEY);
    rateLimiter = new RateLimiter(100, 60000); // 100 requests per minute
  }
}

// Create the MCP server instance
const server = new Server(
  {
    name: 'openwebninja-search-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define available tools
const tools: Tool[] = [
  {
    name: 'web_search',
    description: 'Search the web in real-time using Google SERP data. Returns up to 300 results with title, URL, and snippet for each result.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query to execute'
        },
        max_results: {
          type: 'number',
          description: 'Maximum number of results to return (1-300)',
          minimum: 1,
          maximum: 300,
          default: 10
        },
        region: {
          type: 'string',
          description: 'Region code for localized results (e.g., \'us\', \'uk\', \'ca\')',
          default: 'us'
        },
        safe_search: {
          type: 'boolean',
          description: 'Enable safe search filtering',
          default: true
        }
      },
      required: ['query']
    }
  },
  {
    name: 'bulk_web_search',
    description: 'Execute multiple web searches in a single request. Efficient for processing multiple queries simultaneously.',
    inputSchema: {
      type: 'object',
      properties: {
        queries: {
          type: 'array',
          items: {
            type: 'string'
          },
          description: 'Array of search queries to execute',
          maxItems: 20,
          minItems: 1
        },
        max_results_per_query: {
          type: 'number',
          description: 'Maximum number of results per query',
          minimum: 1,
          maximum: 50,
          default: 10
        },
        region: {
          type: 'string',
          description: 'Region code for localized results',
          default: 'us'
        },
        safe_search: {
          type: 'boolean',
          description: 'Enable safe search filtering',
          default: true
        }
      },
      required: ['queries']
    }
  },
  {
    name: 'advanced_web_search',
    description: 'Search with Google advanced operators like site:, inurl:, intitle:, filetype:, and date ranges for precise results.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The base search query'
        },
        site_restrict: {
          type: 'string',
          description: 'Restrict search to specific domain (e.g., \'github.com\')'
        },
        file_type: {
          type: 'string',
          description: 'Search for specific file types (e.g., \'pdf\', \'doc\', \'ppt\')'
        },
        date_range: {
          type: 'string',
          description: 'Time range for results',
          enum: ['past_day', 'past_week', 'past_month', 'past_year']
        },
        max_results: {
          type: 'number',
          description: 'Maximum number of results to return',
          minimum: 1,
          maximum: 300,
          default: 10
        },
        region: {
          type: 'string',
          description: 'Region code for localized results',
          default: 'us'
        }
      },
      required: ['query']
    }
  }
];

// Tool call handler function
async function handleToolCall(name: string, args: any) {
  try {
    initializeServices();
    
    switch (name) {
      case 'web_search': {
        // Check rate limit
        if (!rateLimiter.canMakeRequest()) {
          const resetTime = rateLimiter.getTimeUntilReset();
          throw new Error(`Rate limit exceeded. Please wait ${Math.ceil(resetTime / 1000)} seconds before making another request.`);
        }

        // Validate and sanitize input
        const validatedParams = validateSearchParams(args);
        
        // Record the request
        rateLimiter.recordRequest();

        // Perform the search
        const result = await apiService.search(validatedParams);

        if (!result.success) {
          throw new Error(`Search failed: ${result.error?.message || 'Unknown error'}`);
        }

        if (!result.data || result.data.results.length === 0) {
          return {
            content: [{
              type: 'text',
              text: `No results found for query: "${validatedParams.query}"`
            }]
          };
        }

        // Format the results
        const { results, query, total_results } = result.data;
        
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
        
        return {
          content: [{
            type: 'text',
            text: output
          }]
        };
      }
      
      case 'bulk_web_search': {
        // Check rate limit for bulk operations
        const estimatedRequests = args.queries?.length || 1;
        if (rateLimiter.getCurrentCount() + estimatedRequests > 100) {
          const resetTime = rateLimiter.getTimeUntilReset();
          throw new Error(`Rate limit would be exceeded with ${estimatedRequests} requests. Please wait ${Math.ceil(resetTime / 1000)} seconds or reduce the number of queries.`);
        }

        // Validate and sanitize input
        const validatedParams = validateBulkSearchParams(args);

        // Perform the bulk search
        const result = await apiService.bulkSearch(validatedParams);

        if (!result.success) {
          throw new Error(`Bulk search failed: ${result.error?.message || 'Unknown error'}`);
        }

        if (!result.data || result.data.searches.length === 0) {
          throw new Error('No search results returned from bulk search');
        }

        // Format the results
        const { searches } = result.data;
        
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
        
        return {
          content: [{
            type: 'text',
            text: output
          }]
        };
      }
      
      case 'advanced_web_search': {
        // Check rate limit
        if (!rateLimiter.canMakeRequest()) {
          const resetTime = rateLimiter.getTimeUntilReset();
          throw new Error(`Rate limit exceeded. Please wait ${Math.ceil(resetTime / 1000)} seconds before making another request.`);
        }

        // Validate and sanitize input
        const validatedParams = validateSearchParams(args);
        
        // Record the request
        rateLimiter.recordRequest();

        // Perform the advanced search
        const result = await apiService.advancedSearch(validatedParams);

        if (!result.success) {
          throw new Error(`Advanced search failed: ${result.error?.message || 'Unknown error'}`);
        }

        if (!result.data || result.data.results.length === 0) {
          return {
            content: [{
              type: 'text',
              text: `No results found for advanced search`
            }]
          };
        }

        // Format the results
        const { results, query, total_results } = result.data;
        
        let output = `# Advanced Web Search Results\n\n`;
        
        // Show search parameters
        output += `## Search Parameters\n`;
        output += `- **Base Query:** "${validatedParams.query}"\n`;
        
        if (validatedParams.site_restrict) {
          output += `- **Site Restriction:** ${validatedParams.site_restrict}\n`;
        }
        
        if (validatedParams.file_type) {
          output += `- **File Type:** ${validatedParams.file_type}\n`;
        }
        
        if (validatedParams.date_range) {
          output += `- **Date Range:** ${validatedParams.date_range}\n`;
        }
        
        if (validatedParams.region) {
          output += `- **Region:** ${validatedParams.region}\n`;
        }
        
        output += `\n**Final Query:** "${query}"\n\n`;
        output += `Found ${total_results || results.length} results\n\n`;

        // Group results by domain if site restriction is used
        if (validatedParams.site_restrict) {
          output += `## Results from ${validatedParams.site_restrict}\n\n`;
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
          if (validatedParams.file_type && result.url) {
            const urlLower = result.url.toLowerCase();
            if (urlLower.includes(`.${validatedParams.file_type}`)) {
              output += `**File Type:** ${validatedParams.file_type.toUpperCase()} document\n`;
            }
          }
          
          output += `\n---\n\n`;
        });
        
        return {
          content: [{
            type: 'text',
            text: output
          }]
        };
      }
      
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    if (error instanceof ValidationError) {
      throw new Error(`Validation error: ${error.message}`);
    }
    throw error;
  }
}

// Set up server handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  return await handleToolCall(name, args);
});

// HTTP handlers for Next.js API routes
export async function GET(request: NextRequest) {
  return NextResponse.json({
    name: 'openwebninja-search-server',
    version: '1.0.0',
    capabilities: {
      tools: {}
    },
    tools: tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema
    }))
  });
}

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
    
    // Handle MCP protocol requests
    switch (body.method) {
      case 'initialize': {
        return NextResponse.json({
          jsonrpc: '2.0',
          id: body.id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {},
            },
            serverInfo: {
              name: 'openwebninja-search-server',
              version: '1.0.0'
            }
          }
        });
      }
      
      case 'tools/list': {
        return NextResponse.json({
          jsonrpc: '2.0',
          id: body.id,
          result: {
            tools
          }
        });
      }
      
      case 'tools/call': {
        const { name, arguments: args } = body.params;
        
        // Handle tool calls directly
        const result = await handleToolCall(name, args);
        return NextResponse.json({
          jsonrpc: '2.0',
          id: body.id,
          result
        });
      }
      
      case 'ping': {
        return NextResponse.json({
          jsonrpc: '2.0',
          id: body.id,
          result: {}
        });
      }
      
      case 'notifications/initialized': {
        return NextResponse.json({
          jsonrpc: '2.0',
          id: body.id,
          result: {}
        });
      }
      
      default: {
        return NextResponse.json(
          {
            jsonrpc: '2.0',
            id: body.id,
            error: {
              code: -32601,
              message: `Method '${body.method}' not supported`
            }
          },
          { status: 400 }
        );
      }
    }
  } catch (error) {
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        id: body?.id || null,
        error: {
          code: -32603,
          message: (error as Error).message
        }
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

// Export runtime config for Vercel
export const runtime = 'nodejs';
export const maxDuration = 60;