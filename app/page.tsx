export default function Home() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>OpenWebNinja MCP Server</h1>
      <p>Real-time web search MCP server using OpenWebNinja API via RapidAPI.</p>
      
      <h2>Available Endpoints:</h2>
      <ul>
        <li><strong>GET /api/mcp</strong> - Get server information and available tools</li>
        <li><strong>POST /api/mcp</strong> - Execute MCP protocol requests</li>
      </ul>
      
      <h2>Available Tools:</h2>
      <ul>
        <li><strong>web_search</strong> - Search the web in real-time using Google SERP data</li>
        <li><strong>bulk_web_search</strong> - Execute multiple web searches in a single request</li>
        <li><strong>advanced_web_search</strong> - Search with Google advanced operators</li>
      </ul>
      
      <h2>Usage:</h2>
      <p>This server implements the Model Context Protocol (MCP) for AI applications to perform web searches.</p>
      
      <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
        <h3>Server Status: ✅ Running</h3>
        <p>Version: 1.0.0</p>
        <p>Protocol: MCP 2024-11-05</p>
      </div>
    </div>
  )
}