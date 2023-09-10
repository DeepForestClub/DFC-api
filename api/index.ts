import type { VercelRequest, VercelResponse } from '@vercel/node';

const rateLimit = (handler: (req: VercelRequest, res: VercelResponse) => void, limit: number, interval: number) => {
  const requests = new Map<string, number>();

  return async (request: VercelRequest, response: VercelResponse) => {
    // Get IP address of client by checking for x-forwarded-for header, which may
    // contain multiple IP addresses if there are intermediate proxies.
    const ip = request.headers['x-forwarded-for']?.split(',')[0].trim() || request.socket.remoteAddress;

    // Check if a token is provided
    const token = request.query.token || '';
    const secretToken = process.env.SECRET_TOKEN;

    // Reject the request if no token is provided
    if (!secretToken && !token) {
      return response.status(401).json({ message: 'Access Denied' });
    }

    // Allow requests without rate limit if the correct token is provided
    if (secretToken && token === secretToken) {
      return handler(request, response);
    }

    // Check if the client has exceeded the rate limit
    const numRequests = requests.get(ip) || 0;
    if (numRequests >= limit) {
      return response.status(429).json({ message: 'Too Many Requests' });
    }

    // Increment the count of requests made by the client
    requests.set(ip, numRequests + 1);

    // Reset the count after the specified interval
    setTimeout(() => requests.delete(ip), interval);

    // Call the original handler
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

const handlerWithRateLimit = rateLimit(apiHandler, 10, 60000); // Allow up to 10 requests per minute

export default handlerWithRateLimit;