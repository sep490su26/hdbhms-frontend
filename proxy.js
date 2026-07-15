import { NextResponse } from 'next/server';

export function proxy(request) {
  const url = request.nextUrl;
  const path = url.pathname;

  // Ignore static assets
  if (path.startsWith('/_next') || path.includes('.')) {
    return NextResponse.next();
  }

  console.log(`[Proxy] Request to: ${path}`);

  // Check for webview query param to set the cookie
  let response = NextResponse.next();
  let isWebView = request.cookies.get('is_webview')?.value === '1';

  if (url.searchParams.get('webview') === '1') {
    isWebView = true;
    response.cookies.set('is_webview', '1', { path: '/' });
  }

  // Enforce webview lock
  if (isWebView) {
    // If the webview tries to access any page other than /rooms (and API routes), force it back to /rooms
    if (path !== '/rooms' && !path.startsWith('/api') && !path.startsWith('/rooms/')) {
      console.log(`[Proxy] Blocked webview navigation to ${path}, redirecting to /rooms`);
      const redirectUrl = new URL('/rooms', request.url);
      const redirectResponse = NextResponse.redirect(redirectUrl);
      redirectResponse.cookies.set('is_webview', '1', { path: '/' });
      return redirectResponse;
    }
  }

  return response;
}
