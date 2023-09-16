import { VercelRequest, VercelResponse } from '@vercel/node';
import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';

// 请求记录的接口定义
interface RequestRecord {
  count: number;                  // 请求计数
  timeout: NodeJS.Timeout | null; // 超时计时器
}

// 限流中间件函数
const rateLimit = (
  handler: (req: VercelRequest, res: VercelResponse) => void, // 原始请求处理函数
  limit: number,      // 允许在指定时间间隔内的最大请求数
  interval: number    // 时间间隔（毫秒）
) => {
  const requests = new Map<string, RequestRecord>(); // 存储请求记录的 Map

  return async (request: VercelRequest, response: VercelResponse) => {
    const ip =
      request.headers['x-forwarded-for']?.split(',')[0].trim() ||
      request.socket?.remoteAddress;

    if (!ip) {
      return response.status(400).json({ message: 'Invalid Request' });
    }

    const token = request.query.token || '';
    const secretToken = process.env.SECRET_TOKEN;

    if (!secretToken && !token) {
      return response.status(401).json({ message: 'Access Denied' });
    }

    if (secretToken && token === secretToken) {
      return handler(request, response);
    }

    let record = requests.get(ip); // 获取 IP 对应的请求记录

    if (!record) {
      record = { count: 1, timeout: null }; // 若无记录，则初始化为 1 次请求
      requests.set(ip, record); // 添加记录
    } else {
      record.count++; // 请求计数加一
    }

    // 判断请求次数是否超过限制
    if (record.count > limit) {
      if (record.timeout) {
        clearTimeout(record.timeout); // 清除超时计时器
      }

      return response.status(429).json({ message: 'Too Many Requests' });
    }

    // 如果未设置超时计时器，则创建一个，在指定时间间隔后删除对应的请求记录
    if (!record.timeout) {
      record.timeout = setTimeout(() => {
        requests.delete(ip);
      }, interval);
    }

    // 获取指定 URL 中的元素数量
    const url = 'https://deep-forest-club.wikidot.com/system:page-tags/tag/%E6%96%87%E7%AB%A0';
    const elementId = 'tagged-pages-list';              // 目标元素的 ID
    const elementClass = 'pages-list-item';             // 目标元素的 Class

    try {
      const html = await fetch(url).then((res) => res.text());     // 发起 HTTP 请求获取 HTML 内容
      const dom = new JSDOM(html);                                 // 使用 JSDOM 解析 HTML
      const container = dom.window.document.getElementById(elementId);  // 获取目标元素的容器
      if (container) {
        const elements = container.getElementsByClassName(elementClass); // 获取目标元素的集合
        const count = elements.length;
        console.log(`Found ${count} elements with class '${elementClass}'`);
      }
    } catch (error) {
      console.error(error);
    }

    return handler(request, response); // 执行原始请求处理函数
  };
};

const apiHandler = (request: VercelRequest, response: VercelResponse) => {
  response.status(200).json({
    body: request.body,
    query: request.query,
    cookies: request.cookies,
  });
};

const handlerWithRateLimit = rateLimit(apiHandler, 10, 60000); // 每分钟最多允许 10 次请求

export default handlerWithRateLimit;