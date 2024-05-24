import axios from 'axios';
import cheerio from 'cheerio';
import { VercelRequest, VercelResponse } from '@vercel/node';
import { Analytics } from "@vercel/analytics/react";

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

async function getPageLinks(url: string): Promise<string[]> {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    const links: string[] = [];
    $('a').each((_, element) => {
        const href = $(element).attr('href');
        if (href && href.startsWith('/')) {
            links.push(href);
        }
    });

    return links;
}

export default async (req: VercelRequest, res: VercelResponse) => {
    try {
        // 获取页面数量 Y
        const listAllPagesUrl = 'https://deep-forest-club.wikidot.com/system:list-all-pages';
        const listAllPagesResponse = await axios.get(listAllPagesUrl);
        const listAllPages$ = cheerio.load(listAllPagesResponse.data);
        const pagerText = listAllPages$('.pager-no').html();
        const totalPages = parseInt(pagerText?.split(' of ')[1] || '0', 10);

        // 访问每个页面并获取链接
        const allLinks: string[] = [];
        for (let i = 1; i <= totalPages; i++) {
            const pageUrl = `${listAllPagesUrl}/p/${i}`;
            const linksOnPage = await getPageLinks(pageUrl);
            allLinks.push(...linksOnPage);
        }

        // 去除重复链接
        const uniqueLinks = [...new Set(allLinks)];

        res.status(200).json(uniqueLinks);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};
