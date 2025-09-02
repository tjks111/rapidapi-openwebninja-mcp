#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import * as dotenv from 'dotenv';

import { OpenWebNinjaService } from './services/openWebNinja.js';
import { RateLimiter } from './utils/rateLimiter.js';
import { validateEnvironment } from './utils/validation.js';
import { WebSearchHandler } from './handlers/webSearch.js';
import { BulkSearchHandler } from './handlers/bulkSearch.js';
import { AdvancedSearchHandler } from './handlers/advancedSearch.js';
import { ALL_TOOLS } from './types/mcp.js';

// Load environment variables
dotenv.config();

/**
 * OpenWebNinja Real-Time Web Search MCP Server
 * 
 * This server provides real-time web search capabilities through the OpenWebNinja API
 * via RapidAPI. It supports basic search, bulk search, and advanced search with
 * Google operators.
 */
class OpenWebNinjaServer {
  private server: Server;
  private apiService: OpenWebNinjaService;
  private rateLimiter: RateLimiter;
  private webSearchHandler: WebSearchHandler;
  private bulkSearchHandler: BulkSearchHandler;
  private advancedSearchHandler: AdvancedSearchHandler;

  constructor() {
    // Validate environment
    validateEnvironment();

    // Initialize services
    this.apiService = new OpenWebNinjaService(process.env.RAPIDAPI_KEY!);
    this.rateLimiter = new RateLimiter(100, 60000); // 100 requests per minute
    
    // Initialize handlers
    this.webSearchHandler = new WebSearchHandler(this.apiService, this.rateLimiter);
    this.bulkSearchHandler = new BulkSearchHandler(this.apiService, this.rateLimiter);
    this.advancedSearchHandler = new AdvancedSearchHandler(this.apiService, this.rateLimiter);

    // Initialize MCP server
    this.server = new Server(
      {
        name: 'openwebninja-search',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // Handle tool listing
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: ALL_TOOLS,
      };
    });

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'web_search':
            return await this.webSearchHandler.handle(args);
          
          case 'bulk_web_search':
            return await this.bulkSearchHandler.handle(args);
          
          case 'advanced_web_search':
            return await this.advancedSearchHandler.handle(args);
          
          default:
            return {
              content: [{
                type: "text",
                text: `Unknown tool: ${name}`
              }],
              isError: true
            };
        }
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    });
  }

  async run(): Promise<void> {
    // Test API connection
    console.error('Testing API connection...');
    const isHealthy = await this.apiService.healthCheck();
    if (!isHealthy) {
      console.error('Warning: API health check failed. The server will still start but may not function properly.');
    } else {
      console.error('API connection successful!');
    }

    // Start the server
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    console.error('OpenWebNinja Real-Time Web Search MCP Server running on stdio');
    console.error('Available tools: web_search, bulk_web_search, advanced_web_search');
  }
}

// Error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.error('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Start the server
if (require.main === module) {
  const server = new OpenWebNinjaServer();
  server.run().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

export { OpenWebNinjaServer };