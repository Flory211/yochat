export async function onRequestPost(context: any) {
  try {
    const { request, env } = context;
    
    const cookieHeader = request.headers.get('cookie');
    const authHeader = request.headers.get('authorization');
    let token: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (cookieHeader) {
      const match = cookieHeader.match(/yochat_token=([^;]+)/);
      if (match) token = match[1];
    }

    if (!token) {
      return new Response(JSON.stringify({ error: 'Необходима авторизация' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { verifyToken } = await import('@/lib/auth');
    const user = await verifyToken(token);

    if (!user) {
      return new Response(JSON.stringify({ error: 'Необходима авторизация' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return new Response(JSON.stringify({ error: 'Файл обязателен' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return new Response(JSON.stringify({ error: 'Размер файла не должен превышать 10 МБ' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // В Cloudflare Workers нет файловой системы — возвращаем ошибку
    return new Response(JSON.stringify({ error: 'Загрузка файлов не поддерживается в Cloudflare Workers' }), { 
      status: 501,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Upload error:', error);
    return new Response(JSON.stringify({ error: 'Ошибка сервера' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
