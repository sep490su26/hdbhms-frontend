import { cookies } from 'next/headers';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const token = formData.get('token');
    const sessionId = formData.get('sessionId');
    const userRole = formData.get('userRole');
    const redirectValue = formData.get('redirect');
    const redirectPath =
      typeof redirectValue === 'string' &&
      redirectValue.startsWith('/') &&
      !redirectValue.startsWith('//')
        ? redirectValue
        : '/rooms';

    const cookieStore = await cookies();
    if (token) {
      cookieStore.set('access_token', token, { httpOnly: true, path: '/' });
    }
    if (sessionId) {
      cookieStore.set('JSESSIONID', sessionId, { httpOnly: true, path: '/' });
    }
    
    // Set a flag to identify webview environment
    cookieStore.set('is_webview', '1', { path: '/' });

    const html = `
      <!DOCTYPE html>
      <html lang="vi">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Đang xác thực...</title>
          <script>
            const token = '${token || ''}';
            const sessionId = '${sessionId || ''}';
            const userRole = '${userRole || ''}';
            const redirectPath = '${redirectPath.replace(/'/g, "\\'")}';

            if (token) {
              window.localStorage.setItem('token', token);
            }
            if (sessionId) {
              window.localStorage.setItem('sessionId', sessionId);
            }
            if (userRole) {
              window.localStorage.setItem('userRole', userRole);
            }
            
            window.location.replace(redirectPath);
          </script>
          <style>
            body {
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              font-family: system-ui, -apple-system, sans-serif;
              background-color: #f8fafc;
              color: #0f172a;
            }
            .loader {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 16px;
            }
            .spinner {
              width: 32px;
              height: 32px;
              border: 3px solid #e2e8f0;
              border-top-color: #0b1220;
              border-radius: 50%;
              animation: spin 1s linear infinite;
            }
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          </style>
        </head>
        <body>
          <div class="loader">
            <div class="spinner"></div>
            <p>Đang chuyển hướng đến phòng...</p>
          </div>
        </body>
      </html>
    `;

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error) {
    console.error("Mobile Auth Error:", error);
    return new Response('Error processing request', { status: 400 });
  }
}
