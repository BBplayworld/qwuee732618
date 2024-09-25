import { defineEventHandler } from 'h3'
import { $fetch } from 'ohmyfetch'
import dayjs from 'dayjs'
import { kv } from '@vercel/kv'

const DATA_KEY = 'company-news'
const DATA_TTL = 3600

const predefinedNews = [
    { related: 'QQQ', source: 'Bloomberg', headline: 'Tech ETF QQQ Surges Amid Market Rally', datetime: '1725460000', summary: 'QQQ has seen a sharp rise in value as tech stocks rally in the market.' },
    { related: 'VOO', source: 'Yahoo', headline: 'VOO ETF Sees Influx of Capital', datetime: '1725460001', summary: 'Investors are pouring capital into VOO as market volatility increases.' },
    { related: 'AAPL', source: 'Yahoo', headline: 'Apple releases new iPhone with groundbreaking features', datetime: '1725460002', summary: 'Apple has introduced a new iPhone model with advanced camera capabilities and better performance.' },
    { related: 'NVDA', source: 'TechCrunch', headline: 'NVIDIA pushes AI hardware boundaries', datetime: '1725460003', summary: 'NVIDIA has unveiled its latest hardware aimed at improving AI processing speeds.' },
    { related: 'MSFT', source: 'SeekingAlpha', headline: 'Microsoft strengthens AI cloud with new acquisition', datetime: '1725460004', summary: 'Microsoft has completed the acquisition of a leading AI startup to boost its cloud AI offerings.' },
    { related: 'GOOG', source: 'Yahoo', headline: 'Google revamps search with AI-driven updates', datetime: '1725460005', summary: 'Google has announced new AI-powered search features to enhance user experience and accuracy.' },
    { related: 'AMZN', source: 'Yahoo Finance', headline: 'Amazon doubles down on grocery delivery', datetime: '1725460006', summary: 'Amazon has expanded its grocery delivery services to additional cities across the U.S.' },
    { related: 'META', source: 'Bloomberg', headline: 'Meta advances into AR with new headset', datetime: '1725460007', summary: 'Meta is set to release its next-generation AR headset aimed at enterprise users.' },
    { related: 'AVGO', source: 'CNBC', headline: 'Broadcom announces next-gen semiconductor', datetime: '1725460008', summary: 'Broadcom has unveiled its latest semiconductor targeting faster 5G connections.' },
    { related: 'TSLA', source: 'Yahoo', headline: 'Tesla unveils new electric truck model', datetime: '1725460009', summary: 'Tesla has introduced an electric truck with enhanced battery range and autonomous driving features.' },
    { related: 'COST', source: 'CNBC', headline: 'Costco sees rise in membership sales', datetime: '1725460010', summary: 'Costco has reported an increase in new membership sign-ups, driven by recent price cuts.' },
    { related: 'ASML', source: 'Reuters', headline: 'ASML advances EUV technology', datetime: '1725460011', summary: 'ASML has made strides in its EUV lithography technology, allowing for more efficient chip production.' },
    { related: 'NFLX', source: 'Hollywood Reporter', headline: 'Netflix adds 10M subscribers in Q3', datetime: '1725460012', summary: 'Netflix has seen a sharp rise in subscribers following the release of several hit series.' },
    { related: 'AZN', source: 'Financial Times', headline: 'AstraZeneca develops next-gen cancer treatment', datetime: '1725460013', summary: 'AstraZeneca has announced a breakthrough in its latest cancer treatment, showing positive clinical trial results.' },
    { related: 'AMD', source: 'The Verge', headline: 'AMD releases new GPU aimed at gamers', datetime: '1725460014', summary: 'AMD has launched its latest graphics card, providing better performance for high-end gaming.' },
    { related: 'ADBE', source: 'TechCrunch', headline: 'Adobe launches AI-powered creative suite', datetime: '1725460015', summary: 'Adobe has introduced AI tools into its creative suite, enhancing productivity for designers and content creators.' },
    { related: 'QCOM', source: 'Reuters', headline: 'Qualcomm partners with automakers for 5G cars', datetime: '1725460016', summary: 'Qualcomm has announced a partnership with major automakers to integrate 5G connectivity into their vehicles.' }
]

export default defineEventHandler(async () => {
    if (process.env.NODE_ENV !== 'production') {
        return predefinedNews
    }

    let stockCache: object[] = []
    try {
        stockCache = await kv.get(DATA_KEY) as object[]
    } catch (e) { }

    if (stockCache?.length > 0) {
        return stockCache
    }

    const symbols = [
        { name: 'QQQ', marketCap: 3000 },
        { name: 'VOO', marketCap: 3000 },
        { name: 'AAPL', marketCap: 3448 },
        { name: 'NVDA', marketCap: 3182 },
        { name: 'MSFT', marketCap: 3098 },
        { name: 'GOOG', marketCap: 2061 },
        { name: 'AMZN', marketCap: 1858 },
        { name: 'META', marketCap: 1335 },
        { name: 'AVGO', marketCap: 774 },
        { name: 'TSLA', marketCap: 703 },
        { name: 'COST', marketCap: 389 },
        { name: 'ASML', marketCap: 356 },
        { name: 'NFLX', marketCap: 294 },
        { name: 'AZN', marketCap: 268 },
        { name: 'AMD', marketCap: 250 },
        { name: 'ADBE', marketCap: 247 },
        { name: 'QCOM', marketCap: 193 },
    ] // 필요한 주식 심볼들

    let from = dayjs().add(-1, 'day').format('YYYY-MM-DD')
    let to = dayjs().format('YYYY-MM-DD')

    const requests = symbols.map(async (symbol) => {
        // 캐시가 유효하지 않다면 데이터를 다시 가져옴
        const url = `https://finnhub.io/api/v1/company-news?symbol=${symbol['name']}&from=${from}&to=${to}`

        try {
            const response = await $fetch(url, {
                headers: {
                    'X-Finnhub-Token': process.env.FINN_4_KEY,
                    'Content-Type': 'application/json',
                    'Accept-Charset': 'utf-8',
                }
            });

            let ranIdx = Math.floor(Math.random() * response.length)
            return response[ranIdx]
        } catch (e) {
            return {}
        }
    })

    let result = await Promise.all(requests)
    result = result.filter(item => (item)) // 빈 객체 제거
    result = result.sort(() => Math.random() - 0.5)

    await kv.set(DATA_KEY, JSON.stringify(result), { ex: DATA_TTL })
    return result;
})
