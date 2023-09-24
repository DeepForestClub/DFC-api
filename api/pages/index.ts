import axios from 'axios';
import cheerio from 'cheerio';
import { VercelRequest, VercelResponse } from '@vercel/node';

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

async function getPageLinks(): Promise<string[]> {
  const listAllPagesUrl = 'https://deep-forest-club.wikidot.com/system:list-all-pages';
  const listAllPagesResponse = await axios.get(listAllPagesUrl);
  const listAllPages$ = cheerio.load(listAllPagesResponse.data);
  const pagerText = listAllPages$('.pager-no').html();
  const totalPages = parseInt(pagerText?.split(' of ')[1] || '0', 10);

  const allLinks: string[] = [];
  for (let i = 1; i <= totalPages; i++) {
    const pageUrl = `${listAllPagesUrl}/p/${i}`;
    const linksOnPage = await getPageLinksFromUrl(pageUrl);
    allLinks.push(...linksOnPage);
  }

  const uniqueLinks = [...new Set(allLinks)];
  return uniqueLinks;
}

async function getPageLinksFromUrl(url: string): Promise<string[]> {
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

async function getPageSource(page: string): Promise<string> {
  // 发送 POST 请求，获取页面源代码
  const endpoint = 'https://api.dfcwiki.eu.org/api/pages';
  const url = `https://deep-forest-club.wikidot.com/${page}`;
  const params = new URLSearchParams();
  params.append('url', url);
  params.append('action', 'get_by_url');
  const response = await axios.post(endpoint, params);

  // 从源代码中提取出<div class="page-source">内部的内容，并将<br>转换为换行符
  const $ = cheerio.load(response.data.page_html);
  const pageSource = $('.page-source').html() || '';
  const source = pageSource.replace(/<br>/g, '\n').trim();
  return source;
}

export default rateLimit(async (req: VercelRequest, res: VercelResponse) => {
  try {
    const page = req.query.page as string;

    if (page) {
      // 获取指定页面的源代码
      const source = await getPageSource(page);
      res.status(200).json({ page, PageSource: source });
    } else {
      // 获取所有页面的链接列表
      const links = await getPageLinks();
      res.status(200).json(links);
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
}, 10, 1000);