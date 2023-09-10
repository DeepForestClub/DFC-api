import type { VercelRequest, VercelResponse } from '@vercel/node';

const rateLimit = (handler: (req: VercelRequest, res: VercelResponse) => void, limit: number, interval: number) => {
  const requests = new Map<string, number>();

  return async (request: VercelRequest, response: VercelResponse) => {
    const ip = request.headers['x-forwarded-for'] || request.socket.remoteAddress;

    // Check if a token is provided
    const token = request.query.token || '';
    const secretToken = process.env.SECRET_TOKEN;

    // Allow requests without rate limit if the correct token is provided
    if (secretToken && token === secretToken) {
      return handler(request, response);
    }

    if (!requests.has(ip)) {
      requests.set(ip, 1);
    } else {
      if (requests.get(ip)! >= limit) {
        return response.status(429).json({ message: 'Too Many Requests' });
      }
      requests.set(ip, requests.get(ip)! + 1);
    }

    setTimeout(() => {
      requests.delete(ip);
    }, interval);

    return handler(request, response);
  };
};

const apiHandler = (request: VercelRequest, response: VercelResponse) => {
  response.status(200).json({
    body: request.body,
    query: request.query,
    cookies: request.cookies,
  });
};

const handlerWithRateLimit = rateLimit(apiHandler, 10, 60000);

export default handlerWithRateLimit;