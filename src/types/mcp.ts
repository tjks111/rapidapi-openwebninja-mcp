// MCP Tool Definitions
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
}

export const WEB_SEARCH_TOOL: MCPTool = {
  name: "web_search",
  description: "Search the web in real-time using Google SERP data. Returns up to 300 results with title, URL, and snippet for each result.",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "The search query to execute"
      },
      max_results: {
        type: "number",
        description: "Maximum number of results to return (1-300)",
        minimum: 1,
        maximum: 300,
        default: 10
      },
      region: {
        type: "string",
        description: "Region code for localized results (e.g., 'us', 'uk', 'ca')",
        default: "us"
      },
      safe_search: {
        type: "boolean",
        description: "Enable safe search filtering",
        default: true
      }
    },
    required: ["query"]
  }
};

export const BULK_WEB_SEARCH_TOOL: MCPTool = {
  name: "bulk_web_search",
  description: "Execute multiple web searches in a single request. Efficient for processing multiple queries simultaneously.",
  inputSchema: {
    type: "object",
    properties: {
      queries: {
        type: "array",
        items: {
          type: "string"
        },
        description: "Array of search queries to execute",
        maxItems: 20,
        minItems: 1
      },
      max_results_per_query: {
        type: "number",
        description: "Maximum number of results per query",
        minimum: 1,
        maximum: 50,
        default: 10
      },
      region: {
        type: "string",
        description: "Region code for localized results",
        default: "us"
      },
      safe_search: {
        type: "boolean",
        description: "Enable safe search filtering",
        default: true
      }
    },
    required: ["queries"]
  }
};

export const ADVANCED_WEB_SEARCH_TOOL: MCPTool = {
  name: "advanced_web_search",
  description: "Search with Google advanced operators like site:, inurl:, intitle:, filetype:, and date ranges for precise results.",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "The base search query"
      },
      site_restrict: {
        type: "string",
        description: "Restrict search to specific domain (e.g., 'github.com')"
      },
      file_type: {
        type: "string",
        description: "Search for specific file types (e.g., 'pdf', 'doc', 'ppt')"
      },
      date_range: {
        type: "string",
        description: "Time range for results",
        enum: ["past_day", "past_week", "past_month", "past_year"]
      },
      max_results: {
        type: "number",
        description: "Maximum number of results to return",
        minimum: 1,
        maximum: 300,
        default: 10
      },
      region: {
        type: "string",
        description: "Region code for localized results",
        default: "us"
      }
    },
    required: ["query"]
  }
};

export const ALL_TOOLS = [WEB_SEARCH_TOOL, BULK_WEB_SEARCH_TOOL, ADVANCED_WEB_SEARCH_TOOL];