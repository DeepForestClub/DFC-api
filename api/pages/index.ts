import axios from 'axios';
import cheerio from 'cheerio';
import { VercelRequest, VercelResponse } from '@vercel/node';

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

async function getPageSource(url: string): Promise<string> {
  try {
    const response = await axios.get(url, { timeout: 5000 });
    const $ = cheerio.load(response.data);
    const viewSourceEventScript = `
      const event = new Event('click');
      event.button = 0;
      WIKIDOT.page.listeners.viewSourceClick(event);
    `;
    const pageSource = await new Promise<string>((resolve, reject) => {
      $('body').append(`<script>${viewSourceEventScript}</script>`);

      setTimeout(() => {
        const source = $('.page-source').html()?.replace(/\n/g, '<br>') || '';
        if (source.trim() === '') {
          reject(new Error('Failed to get page source'));
        } else {
          resolve(source.trim());
        }
      }, 2000);
    });

    return pageSource;
  } catch (error) {
    throw new Error(`Failed to fetch page source: ${error.message}`);
  }
}

export default rateLimit(
  async (req: VercelRequest, res: VercelResponse) => {
    try {
      const page = req.query.page as string;

      if (page) {
        const url = `https://deep-forest-club.wikidot.com${page}`;
        const source = await getPageSource(url);
        res.status(200).json({ page, pageSource: source });
      } else {
        const links = await getPageLinksFromUrl(
          'https://deep-forest-club.wikidot.com/'
        );
        res.status(200).json(links);
      }
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
    }
  },
  10,
  1000
);