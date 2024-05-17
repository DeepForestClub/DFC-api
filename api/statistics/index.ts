import axios from 'axios';
import cheerio from 'cheerio';
import { VercelRequest, VercelResponse } from '@vercel/node';
import { Analytics } from "@vercel/analytics/react";

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

const getTagNumber = async (url: string, tagSelector: string): Promise<number> => {
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    const tagNumber = $(tagSelector).length;
    return tagNumber;
  } catch (error) {
    console.error(error);
    return -1;
  }
};

const apiHandler = async (
  request: VercelRequest,
  response: VercelResponse,
  url: string,
  propertyName: string,
  tagSelector: string
) => {
  const tagNumber = await getTagNumber(request.query.url as string, tagSelector)
  const responseData = {
    [propertyName]: tagNumber,
  }
  response.status(200).json(responseData)
}

const handlerWithRateLimit = rateLimit(
  (req: VercelRequest, res: VercelResponse) => {
    apiHandler(req, res, 'https://deep-forest-club.wikidot.com/system:page-tags-list', 'TagNumber', '.pages-tag-cloud-box > a.tag');
  },
  10,
  60000
);

export default async (request: VercelRequest, response: VercelResponse) => {
  const originalNumberPromise = getTagNumber('https://deep-forest-club.wikidot.com/system:page-tags/tag/%E5%8E%9F%E5%88%9B', '.pages-list-item');
  const reprintedNumberPromise = getTagNumber('https://deep-forest-club.wikidot.com/system:page-tags/tag/%E6%90%AC%E8%BF%90', '.pages-list-item');
  const articlesNumberPromise = getTagNumber('https://deep-forest-club.wikidot.com/system:page-tags/tag/%E6%96%87%E7%AB%A0', '.pages-list-item');
  const topicArticlesNumberPromise = getTagNumber('https://deep-forest-club.wikidot.com/system:page-tags/tag/%E4%B8%BB%E9%A2%98%E6%96%87%E7%AB%A0', '.pages-list-item');
  const nonTopicArticlesNumberPromise = getTagNumber('https://deep-forest-club.wikidot.com/system:page-tags/tag/%E9%9D%9E%E4%B8%BB%E9%A2%98%E6%96%87%E7%AB%A0', '.pages-list-item');
  const cooperationTopicArticlesNumberPromise = getTagNumber('https://deep-forest-club.wikidot.com/system:page-tags/tag/%E5%90%88%E4%BD%9C%E4%B8%BB%E9%A2%98%E6%96%87%E7%AB%A0', '.pages-list-item');
  const cooperationNonTopicArticlesNumberPromise = getTagNumber('https://deep-forest-club.wikidot.com/system:page-tags/tag/%E5%90%88%E4%BD%9C%E9%9D%9E%E4%B8%BB%E9%A2%98%E6%96%87%E7%AB%A0', '.pages-list-item');
  const artNumberPromise = getTagNumber('https://deep-forest-club.wikidot.com/system:page-tags/tag/%E8%89%BA%E6%9C%AF%E4%BD%9C%E5%93%81', '.pages-list-item');
  const spaceNumberPromise = getTagNumber('https://deep-forest-club.wikidot.com/system:page-tags/tag/%E6%88%90%E5%91%98%E9%A1%B5', '.pages-list-item');
  const tagNumberPromise = getTagNumber('https://deep-forest-club.wikidot.com/system:page-tags-list', '.pages-tag-cloud-box > a.tag');

  const originalNumber = await originalNumberPromise;
  const reprintedNumber = await reprintedNumberPromise;
  const articlesNumber = await articlesNumberPromise;
  const topicArticlesNumber = await topicArticlesNumberPromise;
  const nonTopicArticlesNumber = await nonTopicArticlesNumberPromise;
  const cooperationTopicArticlesNumber = await cooperationTopicArticlesNumberPromise;
  const cooperationNonTopicArticlesNumber = await cooperationNonTopicArticlesNumberPromise;
  const artNumber = await artNumberPromise;
  const spaceNumber = await spaceNumberPromise;
  const tagNumber = await tagNumberPromise;

  const responseData = {
    OriginalNumber: originalNumber,
    ReprintedNumber: reprintedNumber,
    ArticlesNumber: articlesNumber,
    topicArticlesNumber: topicArticlesNumber,
    NonTopicArticlesNumber: nonTopicArticlesNumber,
    CooperationTopicArticlesNumber: cooperationTopicArticlesNumber,
    CooperationNonTopicArticlesNumber: cooperationNonTopicArticlesNumber,
    ArtNumber: artNumber,
    SpaceNumber: spaceNumber,
    TagNumber: tagNumber,
  };

  response.status(200).json(responseData);
};
