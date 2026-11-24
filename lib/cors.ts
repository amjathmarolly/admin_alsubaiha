import cors from 'cors'
import { NextRequest, NextResponse } from 'next/server'

// CORS configuration
const corsConfig = cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:8000',
    'http://localhost:8080',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:8080',
    process.env.NEXT_PUBLIC_APP_URL || '',
    process.env.FRONTEND_URL || '',
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400, // 24 hours
})

// Middleware for handling CORS in API routes
export function withCors(
  handler: (req: NextRequest, ...args: any[]) => Promise<NextResponse>
): (req: NextRequest, ...args: any[]) => Promise<NextResponse> {
  return async (req: NextRequest, ...args: any[]) => {
    // Handle OPTIONS request (CORS preflight)
    if (req.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': req.headers.get('origin') || '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Max-Age': '86400',
        },
      })
    }

    // Handle actual request
    const response = await handler(req, ...args)

    // Add CORS headers to response
    const origin = req.headers.get('origin') || '*'
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:8000',
      'http://localhost:8080',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:8080',
      process.env.NEXT_PUBLIC_APP_URL,
      process.env.FRONTEND_URL,
    ].filter(Boolean)

    const isAllowed = allowedOrigins.includes(origin) || origin === '*'

    response.headers.set(
      'Access-Control-Allow-Origin',
      isAllowed ? origin : allowedOrigins[0] || '*'
    )
    response.headers.set(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, OPTIONS, PATCH'
    )
    response.headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Requested-With'
    )
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    response.headers.set('Access-Control-Max-Age', '86400')

    return response
  }
}
