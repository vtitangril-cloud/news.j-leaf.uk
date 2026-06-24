import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 8081;
const PUBLIC_DIR = __dirname;

// Default categories configuration
const RSS_MAP = {
    'ทั้งหมด': 'https://news.google.com/rss?hl=th&gl=TH&ceid=TH:th',
    'ข่าวเด่น': 'https://news.google.com/rss?hl=th&gl=TH&ceid=TH:th',
    'ธุรกิจ': 'https://news.google.com/rss/search?q=%E0%B8%82%E0%B8%AD%E0%B8%87%E0%B8%AD%E0%B8%A3%E0%B9%88%E0%B8%AD%E0%B8%A2+%E0%B8%97%E0%B8%B8%E0%B8%87%E0%B8%AB%E0%B8%A3%E0%B8%89&hl=th&gl=TH&ceid=TH:th',
    'เทคโนโลยี': 'https://news.google.com/rss/search?q=%E0%B9%80%E0%B8%97%E0%B8%84%E0%B9%80%E0%B8%99%E0%B8%AD%E0%B8%A5%E0%B8%AD%E0%B8%88%E0%B8%B5&hl=th&gl=TH&ceid=TH:th',
    'สุขภาพ': 'https://news.google.com/rss/search?q=%E0%B8%AA%E0%B8%B8%E0%B8%82%E0%B8%A0%E0%B8%B2%E0%B8%9F&hl=th&gl=TH&ceid=TH:th',
    'สภาพอากาศ': 'https://news.google.com/rss/search?q=%E0%B8%AA%E0%B8%B1%E0%B8%AB%E0%B8%9A%E0%B8%B2%E0%B8%81%E0%B8%B2%E0%B8%A3%E0%B8%88%E0%B8%9B%E0%B8%B3%E0%B9%84%E0%B8%A1&hl=th&gl=TH&ceid=TH:th',
    'จราจร': 'https://news.google.com/rss/search?q=%E0%B8%88%E0%B8%A3%E0%B8%B2%E0%B8%88%E0%B8%A3&hl=th&gl=TH&ceid=TH:th',
    'การเมือง': 'https://news.google.com/rss/search?q=%E0%B8%81%E0%B8%B2%E0%B8%A3%E0%B9%80%E0%B8%A1%E0%B8%A7%E0%B8%87&hl=th&gl=TH&ceid=TH:th',
    'สังคม': 'https://news.google.com/rss/search?q=%E0%B8%AA%E0%B8%B1%E0%B8%AB%E0%B8%9A%E0%B8%B2%E0%B8%81%E0%B8%B2%E0%B8%A3%E0%B8%88%E0%B8%9B%E0%B8%B3%E0%B9%84%E0%B8%A1&hl=th&gl=TH&ceid=TH:th',
    'ท่องเที่ยว': 'https://news.google.com/rss/search?q=%E0%B8%97%E0%B9%82%E0%B8%AD%E0%B8%87%E0%B8%97%E0%B8%B5%E0%B8%A2&hl=th&gl=TH&ceid=TH:th',
    'การเกษตร': 'https://news.google.com/rss/search?q=%E0%B8%81%E0%B8%B2%E0%B8%A3%E0%B9%80%E0%B8%A1%E0%B8%A7%E0%B8%87&hl=th&gl=TH&ceid=TH:th',
    'เพชรบุรี': 'https://news.google.com/rss/search?q=%E0%B9%80%E0%B8%9E%E0%B8%8A%E0%B8%A3%E0%B8%9A%E0%B8%B8%E0%B8%A3%E0%B8%B5&hl=th&gl=TH&ceid=TH:th',
    'ทั่วไป': 'https://news.google.com/rss?hl=th&gl=TH&ceid=TH:th',
    'กีฬา': 'https://news.google.com/rss/search?q=%E0%B8%81%E0%B8%B4%E0%B8%94%E0%B8%B2&hl=th&gl=TH&ceid=TH:th'
};

// Global cache for stocks, crypto, fuel, exchange rates
let cache = {
    set: [
        { name: 'SET', price: '1,540.90', change: '-2.11%', up: false },
        { name: 'PTT', price: '35.00', change: '-2.1%', up: false },
        { name: 'CPALL', price: '45.50', change: '0%', up: true },
        { name: 'ADVANC', price: '358.00', change: '-0.83%', up: false },
        { name: 'AOT', price: '58.00', change: '-2.52%', up: false }
    ],
    crypto: [
        { name: 'Bitcoin (BTC)', thb: '2,081,260', usd: '62,659.215' },
        { name: 'Ethereum (ETH)', thb: '88,021', usd: '2,650' }
    ],
    gas: [
        { name: 'Gasohol 95', price: '43.10' },
        { name: 'Gasohol 91', price: '42.73' },
        { name: 'Gasohol E20', price: '38.10' },
        { name: 'Diesel', price: '40.80' },
        { name: 'LPG (หุงต้ม)', price: '28.20' }
    ],
    exchange: [
        { name: '1 USD', price: '33.22' },
        { name: '100 JPY', price: '20.56' },
        { name: '1 CNY', price: '4.88' }
    ],
    lastUpdated: new Date()
};

// Function to fetch background market data
async function updateMarketData() {
    try {
        // Fetch Exchange Rate (USD to THB, JPY, CNY)
        const erRes = await fetch('https://open.er-api.com/v6/latest/USD');
        if (erRes.ok) {
            const data = await erRes.json();
            const rates = data.rates;
            if (rates && rates.THB) {
                const usdToThb = rates.THB.toFixed(2);
                const jpyToThb = ((100 / rates.JPY) * rates.THB).toFixed(2);
                const cnyToThb = ((1 / rates.CNY) * rates.THB).toFixed(2);

                cache.exchange = [
                    { name: '1 USD', price: usdToThb },
                    { name: '100 JPY', price: jpyToThb },
                    { name: '1 CNY', price: cnyToThb }
                ];
            }
        }

        // Fetch Crypto Prices (BTC, ETH)
        const cryptoRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=thb,usd');
        if (cryptoRes.ok) {
            const data = await cryptoRes.json();
            if (data.bitcoin && data.ethereum) {
                cache.crypto = [
                    {
                        name: 'Bitcoin (BTC)',
                        thb: data.bitcoin.thb.toLocaleString('th-TH'),
                        usd: data.bitcoin.usd.toLocaleString('en-US')
                    },
                    {
                        name: 'Ethereum (ETH)',
                        thb: data.ethereum.thb.toLocaleString('th-TH'),
                        usd: data.ethereum.usd.toLocaleString('en-US')
                    }
                ];
            }
        }

        // Fetch Yahoo Finance SET index & key stocks
        const symbols = ['%5ETH', 'PTT.BK', 'CPALL.BK', 'ADVANC.BK', 'AOT.BK'];
        const stockData = [];
        for (const sym of symbols) {
            try {
                const yahooRes = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=1d`);
                if (yahooRes.ok) {
                    const data = await yahooRes.json();
                    const meta = data.chart?.result?.[0]?.meta;
                    if (meta) {
                        const price = meta.regularMarketPrice;
                        const prevClose = meta.chartPreviousClose;
                        const changeVal = price - prevClose;
                        const changePercent = ((changeVal / prevClose) * 100).toFixed(2);
                        const changeStr = `${changeVal >= 0 ? '+' : ''}${changePercent}%`;
                        const cleanName = sym.replace('%5ETH', 'SET').replace('.BK', '');
                        stockData.push({
                            name: cleanName,
                            price: price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                            change: changeStr,
                            up: changeVal >= 0
                        });
                    }
                }
            } catch (err) {
                console.error(`Error fetching Yahoo stock ${sym}:`, err.message);
            }
        }
        if (stockData.length === symbols.length) {
            cache.set = stockData;
        }

        cache.lastUpdated = new Date();
    } catch (err) {
        console.error('Failed to update market data:', err.message);
    }
}

// Start background updates every 30 minutes
setInterval(updateMarketData, 30 * 60 * 1000);
// Trigger initial fetch
updateMarketData();

// Utility function to fetch RSS feeds
async function fetchRSS(url) {
    try {
        const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.text();
    } catch (err) {
        console.error('RSS fetch error:', err.message);
        return null;
    }
}

// Regular Expression based RSS Parser
function parseRSS(xml) {
    if (!xml) return [];
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemRegex.exec(xml)) !== null) {
        const itemContent = match[1];
        const titleMatch = itemContent.match(/<title>([\s\S]*?)<\/title>/);
        const linkMatch = itemContent.match(/<link>([\s\S]*?)<\/link>/);
        const pubDateMatch = itemContent.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
        const sourceMatch = itemContent.match(/<source[^>]*>([\s\S]*?)<\/source>/);

        let title = titleMatch ? titleMatch[1] : '';
        let link = linkMatch ? linkMatch[1] : '';
        let pubDate = pubDateMatch ? pubDateMatch[1] : '';
        let source = sourceMatch ? sourceMatch[1] : 'News';

        // Unescape HTML entities & CDATA
        title = title.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
                     .replace(/&amp;/g, '&')
                     .replace(/&lt;/g, '<')
                     .replace(/&gt;/g, '>')
                     .replace(/&quot;/g, '"')
                     .replace(/&#39;/g, "'");
                     
        link = link.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');

        items.push({ title, link, pubDate, source });
    }
    return items;
}

// Function to format Date in Thai
function getThaiHeaderDate(date) {
    return new Intl.DateTimeFormat('th-TH', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    }).format(date);
}

const server = http.createServer(async (req, res) => {
    const urlObj = new URL(req.url, `http://${req.headers.host}`);
    const pathname = urlObj.pathname;

    // Handle PWA Assets & Icons
    if (pathname === '/manifest.json') {
        fs.readFile(path.join(PUBLIC_DIR, 'manifest.json'), (err, content) => {
            if (err) {
                res.writeHead(404);
                res.end();
            } else {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(content);
            }
        });
        return;
    }

    if (pathname === '/sw.js') {
        fs.readFile(path.join(PUBLIC_DIR, 'sw.js'), (err, content) => {
            if (err) {
                res.writeHead(404);
                res.end();
            } else {
                res.writeHead(200, { 'Content-Type': 'text/javascript' });
                res.end(content);
            }
        });
        return;
    }

    if (pathname === '/icon-192.png' || pathname === '/icon-512.png') {
        fs.readFile(path.join(PUBLIC_DIR, pathname.substring(1)), (err, content) => {
            if (err) {
                res.writeHead(404);
                res.end();
            } else {
                res.writeHead(200, { 'Content-Type': 'image/png' });
                res.end(content);
            }
        });
        return;
    }

    // Main App SSR Routing
    if (pathname === '/' || pathname === '/index.html') {
        const category = urlObj.searchParams.get('cat') || 'ทั้งหมด';
        const feedUrl = RSS_MAP[category] || RSS_MAP['ทั้งหมด'];
        
        // Fetch news feed
        const xml = await fetchRSS(feedUrl);
        const allItems = parseRSS(xml);
        const newsItems = allItems.slice(0, 15);
        
        // Prepare news cards html
        let newsCardsHtml = '';
        if (newsItems.length === 0) {
            newsCardsHtml = `
                <div class="card">
                    <p style="text-align: center; color: var(--secondary); padding: 1.5rem;">ไม่พบข่าวในหมวดหมู่นี้ หรือระบบดึงข้อมูลขัดข้องชั่วคราว</p>
                </div>`;
        } else {
            newsItems.forEach(item => {
                const formattedDate = item.pubDate ? new Date(item.pubDate).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }) : '';
                newsCardsHtml += `
                    <div class="card">
                        <span class="badge">${category}</span>
                        <div class="news-item-title"><a href="${item.link}" target="_blank">${item.title}</a></div>
                        <div class="news-meta">แหล่งข่าว: ${item.source} • ${formattedDate} น.</div>
                        <a href="${item.link}" target="_blank" style="color: var(--primary); text-decoration: none; font-weight: 700; font-size: 0.85rem;">อ่านต่อ &rarr;</a>
                    </div>`;
            });
        }

        // Prepare Breaking news (first 3 items from general feed as breaking news)
        let breakingItems = [];
        if (category === 'ทั้งหมด' || category === 'ข่าวเด่น') {
            breakingItems = newsItems.slice(0, 3);
        } else {
            const generalXml = await fetchRSS(RSS_MAP['ทั้งหมด']);
            breakingItems = parseRSS(generalXml).slice(0, 3);
        }

        let mobileBreakingHtml = '';
        let sidebarBreakingHtml = '';

        if (breakingItems.length === 0) {
            const placeholder = '<p style="font-size: 0.85rem; color: var(--secondary); margin: 0;">ไม่มีข่าวด่วนขณะนี้</p>';
            mobileBreakingHtml = placeholder;
            sidebarBreakingHtml = placeholder;
        } else {
            breakingItems.forEach(item => {
                const timeStr = item.pubDate ? new Date(item.pubDate).toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' }) + ' น.' : '';
                const itemHtml = `
                    <div class="breaking-item">
                        <a href="${item.link}" target="_blank" class="breaking-link">${item.title}</a>
                        <div class="breaking-time">แหล่งข่าว: ${item.source} • ${timeStr}</div>
                    </div>`;
                mobileBreakingHtml += itemHtml;
                sidebarBreakingHtml += itemHtml;
            });
        }

        // Prepare stock ticker content
        let tickerHtml = '';
        cache.set.forEach(item => {
            const isUp = item.up;
            tickerHtml += `<span>${item.name}: <span class="${isUp ? 'up' : 'down'}">${item.price} (${item.change})</span> &nbsp;&nbsp;&nbsp;&nbsp;</span>`;
        });
        cache.crypto.forEach(item => {
            tickerHtml += `<span style="color:var(--crypto)">${item.name}: ${item.thb} บาท ($${item.usd}) &nbsp;&nbsp;&nbsp;&nbsp;</span>`;
        });
        cache.gas.forEach(item => {
            tickerHtml += `<span style="color:var(--energy)">${item.name}: ${item.price} บาท &nbsp;&nbsp;&nbsp;&nbsp;</span>`;
        });

        // Prepare sidebar market sections
        let setContentHtml = '';
        cache.set.forEach(item => {
            const isUp = item.up;
            setContentHtml += `<div class="market-item"><span><b>${item.name}</b></span><span class="price-val ${isUp ? 'up' : 'down'}">${item.price}<br><small style="font-weight:normal">(${item.change})</small></span></div>`;
        });

        let cryptoContentHtml = '';
        cache.crypto.forEach(item => {
            cryptoContentHtml += `<div class="market-item"><span><b>${item.name}</b></span><span class="price-val">${item.thb}<span class="price-usd">($${item.usd})</span></span></div>`;
        });

        let gasContentHtml = '';
        cache.gas.forEach(item => {
            gasContentHtml += `<div class="market-item"><span><b>${item.name}</b></span><span class="price-val">${item.price} บาท/ลิตร</span></div>`;
        });

        let exchangeContentHtml = '';
        cache.exchange.forEach(item => {
            exchangeContentHtml += `<div class="market-item"><span><b>${item.name}</b></span><span class="price-val">${item.price} บาท</span></div>`;
        });

        // Read Template and render placeholders
        fs.readFile(path.join(PUBLIC_DIR, 'template.html'), 'utf-8', (err, html) => {
            if (err) {
                res.writeHead(500);
                res.end('Error loading template.');
                return;
            }

            const headerDate = getThaiHeaderDate(new Date());
            const updateTime = new Date().toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', second: '2-digit' });

            let renderedHtml = html;
            renderedHtml = renderedHtml.replace('{{HEADER_DATE}}', headerDate);
            renderedHtml = renderedHtml.replace('{{CATEGORY_NAME}}', category);
            renderedHtml = renderedHtml.replace('{{NEWS_CARDS}}', newsCardsHtml);
            renderedHtml = renderedHtml.replace('{{MOBILE_BREAKING_NEWS}}', mobileBreakingHtml);
            renderedHtml = renderedHtml.replace('{{SIDEBAR_BREAKING_NEWS}}', sidebarBreakingHtml);
            renderedHtml = renderedHtml.replace('{{TICKER_CONTENT}}', tickerHtml);
            renderedHtml = renderedHtml.replace('{{MARKET_SET_CONTENT}}', setContentHtml);
            renderedHtml = renderedHtml.replace('{{MARKET_CRYPTO_CONTENT}}', cryptoContentHtml);
            renderedHtml = renderedHtml.replace('{{MARKET_GAS_CONTENT}}', gasContentHtml);
            renderedHtml = renderedHtml.replace('{{MARKET_EXCHANGE_CONTENT}}', exchangeContentHtml);
            renderedHtml = renderedHtml.replace('{{UPDATE_TIME}}', updateTime);

            // Replace active state placeholder classes
            Object.keys(RSS_MAP).forEach(cat => {
                const placeholder = `{{ACTIVE_${cat}}}`;
                const val = (cat === category) ? 'active' : '';
                renderedHtml = renderedHtml.replace(new RegExp(placeholder, 'g'), val);
            });

            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(renderedHtml);
        });
        return;
    }

    res.writeHead(404);
    res.end('Not Found');
});

server.listen(PORT, () => {
    console.log(`News webserver running at http://localhost:${PORT}`);
});
