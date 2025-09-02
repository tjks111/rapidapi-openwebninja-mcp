import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'OpenWebNinja MCP Server',
  description: 'Real-time web search MCP server using OpenWebNinja API via RapidAPI',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}