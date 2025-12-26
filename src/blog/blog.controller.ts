import { Controller, Get, Param, Query, Header, Res } from '@nestjs/common';
import { Response } from 'express';
import { BlogService } from './blog.service';

@Controller('api/blog')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @Get()
  async findAll(@Query('tag') tag?: string) {
    const posts = await this.blogService.findAll();
    
    if (tag) {
      return posts.filter(post => post.tags && post.tags.includes(tag));
    }
    
    return posts;
  }

  @Get('tags')
  async getAllTags() {
    const posts = await this.blogService.findAll();
    const tagSet = new Set<string>();
    
    posts.forEach(post => {
      if (post.tags) {
        post.tags.forEach(tag => tagSet.add(tag));
      }
    });
    
    return Array.from(tagSet).sort();
  }

  @Get('rss')
  @Header('Content-Type', 'application/rss+xml; charset=utf-8')
  async getRssFeed(@Res() res: Response) {
    const posts = await this.blogService.findAll();
    const siteUrl = 'https://pleb.one';
    const feedUrl = `${siteUrl}/api/blog/rss`;
    
    const escapeXml = (text: string): string => {
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    };

    const getExcerpt = (content: string, maxLength = 300): string => {
      const plainText = content.replace(/[#*_`\[\]]/g, '').trim();
      if (plainText.length <= maxLength) return plainText;
      return plainText.substring(0, maxLength).trim() + '...';
    };

    const items = posts.map(post => {
      const postUrl = `${siteUrl}/post.html?id=${post.id}`;
      const pubDate = new Date(post.createdAt).toUTCString();
      const categories = post.tags ? post.tags.map(tag => `<category>${escapeXml(tag)}</category>`).join('\n        ') : '';
      
      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${postUrl}</link>
      <guid isPermaLink="true">${postUrl}</guid>
      <pubDate>${pubDate}</pubDate>
      <description><![CDATA[${getExcerpt(post.content)}]]></description>
      ${categories}
    </item>`;
    }).join('\n');

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Pleb.One Blog</title>
    <link>${siteUrl}/blog.html</link>
    <description>News, updates, and insights from the Pleb.One team. Open source Nostr tools and freedom tech.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml"/>
    <image>
      <url>${siteUrl}/images/pleb-one-logo.png</url>
      <title>Pleb.One Blog</title>
      <link>${siteUrl}/blog.html</link>
    </image>
${items}
  </channel>
</rss>`;

    res.send(rss);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.blogService.findOne(id);
  }
}
