import axios from 'axios';
import cheerio from 'cheerio';
import { VercelRequest, VercelResponse } from '@vercel/node';

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
