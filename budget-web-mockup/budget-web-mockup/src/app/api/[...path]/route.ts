import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = 'http://trend-alb-1755058843.ap-southeast-2.elb.amazonaws.com/api/v1';

async function proxyRequest(request: NextRequest, path: string) {
  const url = `${API_BASE_URL}/${path}`;
  console.log(`[Proxy] ${request.method} ${url}`);

  // Forward headers, especially Authorization
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const authHeader = request.headers.get('Authorization');
  if (authHeader) {
    headers['Authorization'] = authHeader;
    console.log('[Proxy] Auth header present');
  } else {
    console.log('[Proxy] No auth header');
  }

  // Build fetch options
  const fetchOptions: RequestInit = {
    method: request.method,
    headers,
  };

  // Forward body for POST, PUT, PATCH requests
  if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    try {
      const body = await request.json();
      fetchOptions.body = JSON.stringify(body);
    } catch {
      // No body or invalid JSON - that's okay for some requests
    }
  }

  try {
    const response = await fetch(url, fetchOptions);
    console.log(`[Proxy] Backend response status: ${response.status}`);
    const data = await response.json().catch(() => ({}));
    console.log('[Proxy] Backend response data:', JSON.stringify(data).substring(0, 200));

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[Proxy] Error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to API server' },
      { status: 502 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path.join('/'));
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path.join('/'));
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path.join('/'));
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path.join('/'));
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path.join('/'));
}
