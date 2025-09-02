# OpenWebNinja Real-Time Web Search MCP Server

A powerful Model Context Protocol (MCP) server that provides real-time web search capabilities through the OpenWebNinja API via RapidAPI. This server enables AI applications to perform Google searches, bulk searches, and advanced searches with operators.

## 🚀 Features

- **Real-time Google Search**: Get up to 300 search results per query
- **Bulk Search**: Process up to 20 queries simultaneously
- **Advanced Search**: Use Google operators (site:, filetype:, etc.)
- **Rate Limiting**: Built-in protection against API abuse
- **Vercel Ready**: Deploy as serverless functions
- **TypeScript**: Full type safety and excellent developer experience

## 📋 Prerequisites

- Node.js 18.0.0 or higher
- RapidAPI account and subscription to OpenWebNinja Real-Time Web Search API
- Git (for deployment)

## 🛠️ Installation

### Local Development

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd openwebninja-mcp-server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your RapidAPI key:
   ```env
   RAPIDAPI_KEY=your_rapidapi_key_here
   ```

4. **Build the project**
   ```bash
   npm run build
   ```

5. **Start the server**
   ```bash
   npm start
   ```

### Get Your RapidAPI Key

1. Sign up at [RapidAPI](https://rapidapi.com/)
2. Subscribe to [OpenWebNinja Real-Time Web Search API](https://rapidapi.com/openwebninja/api/real-time-web-search)
3. Copy your API key from the dashboard
4. The API offers a generous free tier for testing

## 🔧 Available Tools

### 1. Web Search (`web_search`)

Perform a basic real-time web search.

**Parameters:**
- `query` (required): Search query string
- `max_results` (optional): Number of results (1-300, default: 10)
- `region` (optional): Region code (e.g., 'us', 'uk', 'ca')
- `safe_search` (optional): Enable safe search (default: true)

**Example:**
```json
{
  "query": "artificial intelligence trends 2024",
  "max_results": 20,
  "region": "us"
}
```

### 2. Bulk Web Search (`bulk_web_search`)

Execute multiple searches in a single request.

**Parameters:**
- `queries` (required): Array of search queries (max 20)
- `max_results_per_query` (optional): Results per query (1-50, default: 10)
- `region` (optional): Region code
- `safe_search` (optional): Enable safe search

**Example:**
```json
{
  "queries": [
    "machine learning frameworks",
    "deep learning tutorials",
    "AI ethics guidelines"
  ],
  "max_results_per_query": 5
}
```

### 3. Advanced Web Search (`advanced_web_search`)

Search with Google operators and advanced filtering.

**Parameters:**
- `query` (required): Base search query
- `site_restrict` (optional): Restrict to specific domain
- `file_type` (optional): Search for specific file types (pdf, doc, etc.)
- `date_range` (optional): Time filter (past_day, past_week, past_month, past_year)
- `max_results` (optional): Number of results (1-300, default: 10)
- `region` (optional): Region code

**Example:**
```json
{
  "query": "machine learning research",
  "site_restrict": "arxiv.org",
  "file_type": "pdf",
  "date_range": "past_year"
}
```

## 🌐 Deployment

### Deploy to Vercel

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel
   ```

4. **Set environment variables**
   ```bash
   vercel env add RAPIDAPI_KEY
   ```

5. **Redeploy with environment variables**
   ```bash
   vercel --prod
   ```

### Deploy to Other Platforms

The server can be deployed to any Node.js hosting platform:
- Heroku
- Railway
- DigitalOcean App Platform
- AWS Lambda
- Google Cloud Functions

## 🔌 Usage with MCP Clients

### Claude Desktop

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "openwebninja-search": {
      "command": "node",
      "args": ["/path/to/openwebninja-mcp-server/dist/index.js"],
      "env": {
        "RAPIDAPI_KEY": "your_rapidapi_key_here"
      }
    }
  }
}
```

### HTTP API Usage

When deployed to Vercel, you can also use the HTTP API:

```bash
# Get available tools
curl https://your-deployment.vercel.app/api/mcp?action=tools

# Perform a search
curl -X POST https://your-deployment.vercel.app/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "web_search",
    "params": {
      "query": "OpenAI GPT-4",
      "max_results": 10
    }
  }'
```

## 📊 Rate Limiting

The server includes built-in rate limiting:
- **Default**: 100 requests per minute
- **Configurable**: Set custom limits via environment variables
- **Bulk searches**: Count as multiple requests
- **Automatic backoff**: Provides wait times when limits are exceeded

## 🛡️ Security Features

- **Input validation**: All parameters are validated and sanitized
- **Query sanitization**: Prevents injection attacks
- **Rate limiting**: Protects against abuse
- **Error handling**: Graceful failure with informative messages
- **Environment variables**: Secure API key management

## 🔍 Advanced Search Operators

Supported Google search operators:
- `site:domain.com` - Search within a specific website
- `filetype:pdf` - Find specific file types
- `intitle:keyword` - Find pages with keyword in title
- `inurl:keyword` - Find pages with keyword in URL
- `"exact phrase"` - Search for exact phrase
- `keyword1 OR keyword2` - Search for either term
- `keyword -exclude` - Exclude specific terms

## 📈 API Response Format

All tools return structured data with:
- **Title**: Page title
- **URL**: Direct link to the page
- **Snippet**: Description/excerpt
- **Domain**: Source domain
- **Position**: Search result ranking
- **Date**: Publication date (when available)

## 🐛 Troubleshooting

### Common Issues

1. **"RAPIDAPI_KEY environment variable is required"**
   - Ensure your `.env` file contains a valid RapidAPI key
   - Check that the key is correctly set in your deployment environment

2. **"Rate limit exceeded"**
   - Wait for the specified time before making more requests
   - Consider upgrading your RapidAPI plan for higher limits

3. **"API health check failed"**
   - Verify your RapidAPI subscription is active
   - Check your API key permissions
   - Ensure you have remaining quota

4. **"No results found"**
   - Try different search terms
   - Remove advanced filters to broaden the search
   - Check if the query is too specific

### Debug Mode

Run with debug logging:
```bash
NODE_ENV=development npm run dev
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-username/openwebninja-mcp-server/issues)
- **API Documentation**: [OpenWebNinja API Docs](https://rapidapi.com/openwebninja/api/real-time-web-search)
- **MCP Protocol**: [Model Context Protocol](https://modelcontextprotocol.io/)

## 🔗 Related Projects

- [Model Context Protocol](https://github.com/modelcontextprotocol)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Claude Desktop](https://claude.ai/)

---

**Built with ❤️ for the MCP ecosystem**