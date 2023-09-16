import { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import cheerio from 'cheerio';

interface RequestRecord {
  count: number;
  timeout: NodeJS.Timeout | null;
}

const rateLimit = (
  handler: (req: VercelRequest, res: VercelResponse) => void,
  limit: number,
  interval: number
) => {
  const requests = new Map<string, RequestRecord>();

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

    let record = requests.get(ip);

    if (!record) {
      record = { count: 1, timeout: null };
      requests.set(ip, record);
    } else {
      record.count++;
    }

    if (record.count > limit) {
      if (record.timeout) {
        clearTimeout(record.timeout);
      }

      return response.status(429).json({ message: 'Too Many Requests' });
    }

    if (!record.timeout) {
      record.timeout = setTimeout(() => {
        requests.delete(ip);
      }, interval);
    }

    return handler(request, response);
  };
};

const getPageTags = async (url: string): Promise<number> => {
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    const tagNumber = $('.pages-list-item').length;
    console.log(`TagNumber: ${tagNumber}`);
    return tagNumber;
  } catch (error) {
    console.error(error);
    return -1; // 返回一个错误标识值
  }
};

const apiHandler = async (request: VercelRequest, response: VercelResponse, url: string, propertyName: string) => {
  const tagNumber = await getPageTags(url);
  const responseData = {
    [propertyName]: tagNumber,
  };
  response.status(200).json(responseData);
};

const handlerWithRateLimit = rateLimit(apiHandler, 10, 60000); // 允许每分钟最多发出10个请求

export default async (request: VercelRequest, response: VercelResponse) => {
  const originalNumberPromise = getPageTags('https://deep-forest-club.wikidot.com/system:page-tags/tag/%E5%8E%9F%E5%88%9B');
  const reprintedNumberPromise = getPageTags('https://deep-forest-club.wikidot.com/system:page-tags/tag/%E6%90%AC%E8%BF%90');
  const articlesNumberPromise = getPageTags('https://deep-forest-club.wikidot.com/system:page-tags/tag/%E6%96%87%E7%AB%A0');
  const artNumberPromise = getPageTags('https://deep-forest-club.wikidot.com/system:page-tags/tag/%E8%89%BA%E6%9C%AF%E4%BD%9C%E5%93%81');

  const originalNumber = await originalNumberPromise;
  const reprintedNumber = await reprintedNumberPromise;
  const articlesNumber = await articlesNumberPromise;
  const artNumber = await artNumberPromise;

  const responseData = {
    OriginalNumber: originalNumber,
    ReprintedNumber: reprintedNumber,
    ArticlesNumber: articlesNumber,
    ArtNumber: artNumber,
  };

  response.status(200).json(responseData);
};