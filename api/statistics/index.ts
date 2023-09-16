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

// 原创页面数量
const getPageTags = async (): Promise<number> => {
  try {
    const response = await axios.get('https://deep-forest-club.wikidot.com/system:page-tags/tag/%E5%8E%9F%E5%88%9B');
    const $ = cheerio.load(response.data);
    const originalNumber = $('.pages-list-item').length;
    console.log(`originalNumber: ${originalNumber}`);
    return originalNumber;
  } catch (error) {
    console.error(error);
    return -1; // 返回一个错误标识值
  }
};

const apiHandler = async (_: VercelRequest, response: VercelResponse) => {
  const originalNumber = await getPageTags();
  response.status(200).json({
    OriginalNumber: originalNumber,
  });
};

// 搬运页面数量
const getPageTags = async (): Promise<number> => {
  try {
    const response = await axios.get('https://deep-forest-club.wikidot.com/system:page-tags/tag/%E6%90%AC%E8%BF%90');
    const $ = cheerio.load(response.data);
    const reprintedNumber = $('.pages-list-item').length;
    console.log(`reprintedNumber: ${reprintedNumber}`);
    return reprintedNumber;
  } catch (error) {
    console.error(error);
    return -1; // 返回一个错误标识值
  }
};

const apiHandler = async (_: VercelRequest, response: VercelResponse) => {
  const reprintedNumber = await getPageTags();
  response.status(200).json({
    ReprintedNumber: reprintedNumber,
  });
};

// 全部文章数量
const getPageTags = async (): Promise<number> => {
  try {
    const response = await axios.get('https://deep-forest-club.wikidot.com/system:page-tags/tag/%E6%96%87%E7%AB%A0');
    const $ = cheerio.load(response.data);
    const articlesNumber = $('.pages-list-item').length;
    console.log(`ArticleNumber: ${articlesNumber}`);
    return articlesNumber;
  } catch (error) {
    console.error(error);
    return -1; // 返回一个错误标识值
  }
};

const apiHandler = async (_: VercelRequest, response: VercelResponse) => {
  const articlesNumber = await getPageTags();
  response.status(200).json({
    ArticleNumber: articlesNumber,
  });
};

// 艺术作品数量
const getPageTags = async (): Promise<number> => {
  try {
    const response = await axios.get('https://deep-forest-club.wikidot.com/system:page-tags/tag/%E8%89%BA%E6%9C%AF%E4%BD%9C%E5%93%81');
    const $ = cheerio.load(response.data);
    const artNumber = $('.pages-list-item').length;
    console.log(`ArtNumber: ${artNumber}`);
    return artNumber;
  } catch (error) {
    console.error(error);
    return -1; // 返回一个错误标识值
  }
};

const apiHandler = async (_: VercelRequest, response: VercelResponse) => {
  const artNumber = await getPageTags();
  response.status(200).json({
    ArtNumber: artNumber,
  });
};

const handlerWithRateLimit = rateLimit(apiHandler, 10, 60000); // 允许每分钟最多发出10个请求

export default handlerWithRateLimit;
