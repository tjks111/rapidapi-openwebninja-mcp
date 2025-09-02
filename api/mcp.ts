import { VercelRequest, VercelResponse } from '@vercel/node';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import { OpenWebNinjaService } from '../src/services/openWebNinja.js';
import { RateLimiter } from '../src/utils/rateLimiter.js';
import { WebSearchHandler } from '../src/handlers/webSearch.js';
import { BulkSearchHandler } from '../src/handlers/bulkSearch.js';
import { AdvancedSearchHandler } from '../src/handlers/advancedSearch.js';
import { ALL_TOOLS } from '../src/types/mcp.js';

// Global instances for serverless optimization
let apiService: OpenWebNinjaService;
let rateLimiter: RateLimiter;
let webSearchHandler: WebSearchHandler;
let bulkSearchHandler: BulkSearchHandler;
let advancedSearchHandler: AdvancedSearchHandler;

// Initialize services (only once per cold start)
function initializeServices() {
  if (!apiService) {
    if (!process.env.RAPIDAPI_KEY) {
      throw new Error('RAPIDAPI_KEY environment variable is required');
    }

    apiService = new OpenWebNinjaService(process.env.RAPIDAPI_KEY);
    rateLimiter = new RateLimiter(100, 60000); // 100 requests per minute
    
    webSearchHandler = new WebSearchHandler(apiService, rateLimiter);
    bulkSearchHandler = new BulkSearchHandler(apiService, rateLimiter);
    advancedSearchHandler = new AdvancedSearchHandler(apiService, rateLimiter);
  }
}

/**
 * Vercel serverless function handler for MCP protocol
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Initialize services
    initializeServices();

    // Handle different HTTP methods
    switch (req.method) {
      case 'GET':
        return handleGetRequest(req, res);
      
      case 'POST':
        return handlePostRequest(req, res);
      
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Handler error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Handle GET requests - return server info and available tools
 */
async function handleGetRequest(req: VercelRequest, res: VercelResponse) {
  const { action } = req.query;

  switch (action) {
    case 'tools':
      return res.status(200).json({
        tools: ALL_TOOLS
      });
    
    case 'health':
      const isHealthy = await apiService.healthCheck();
      return res.status(200).json({
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      });
    
    default:
      return res.status(200).json({
        name: 'OpenWebNinja Real-Time Web Search MCP Server',
        version: '1.0.0',
        description: 'Real-time web search capabilities through OpenWebNinja API',
        tools: ALL_TOOLS.map(tool => ({
          name: tool.name,
          description: tool.description
        })),
        endpoints: {
          tools: '/api/mcp?action=tools',
          health: '/api/mcp?action=health',
          search: 'POST /api/mcp'
        }
      });
  }
}

/**
 * Handle POST requests - execute MCP tools
 */
async function handlePostRequest(req: VercelRequest, res: VercelResponse) {
  const { tool, params } = req.body;

  if (!tool) {
    return res.status(400).json({
      error: 'Missing tool parameter',
      message: 'Request body must include a "tool" field'
    });
  }

  try {
    let result;

    switch (tool) {
      case 'web_search':
        result = await webSearchHandler.handle(params || {});
        break;
      
      case 'bulk_web_search':
        result = await bulkSearchHandler.handle(params || {});
        break;
      
      case 'advanced_web_search':
        result = await advancedSearchHandler.handle(params || {});
        break;
      
      default:
        return res.status(400).json({
          error: 'Unknown tool',
          message: `Tool "${tool}" is not supported`,
          availableTools: ALL_TOOLS.map(t => t.name)
        });
    }

    // Return the result
    return res.status(200).json({
      success: !result.isError,
      tool,
      result: result.content,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Tool execution error:', error);
    return res.status(500).json({
      error: 'Tool execution failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      tool
    });
  }
}

/**
 * Helper function for MCP protocol compatibility
 * This allows the same handlers to work in both stdio and HTTP modes
 */
export async function handleMCPRequest(request: any) {
  initializeServices();

  if (request.method === 'tools/list') {
    return {
      tools: ALL_TOOLS
    };
  }

  if (request.method === 'tools/call') {
    const { name, arguments: args } = request.params;

    switch (name) {
      case 'web_search':
        return await webSearchHandler.handle(args);
      
      case 'bulk_web_search':
        return await bulkSearchHandler.handle(args);
      
      case 'advanced_web_search':
        return await advancedSearchHandler.handle(args);
      
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  throw new Error(`Unknown method: ${request.method}`);
}