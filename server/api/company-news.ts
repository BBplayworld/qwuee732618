import { defineEventHandler } from 'h3'
import { $fetch } from 'ohmyfetch'
import dayjs from 'dayjs'
import { kv } from '@vercel/kv'

const DATA_KEY = 'company-news'
const DATA_TTL = 3600

const predefinedNews = [
    { related: 'AAPL', source: 'Yahoo', headline: 'Apple launches new iPhone model', datetime: '1725459956', summary: 'Apple announced its latest iPhone model, featuring new camera improvements.' },
    { related: 'MSFT', source: 'SeekingAlpha', headline: 'Microsoft acquires AI startup', datetime: '1725459956', summary: 'Microsoft has acquired an AI startup to enhance its cloud offerings.' },
    { related: 'GOOG', source: 'Yahoo', headline: 'Google introduces AI-powered search', datetime: '1725459956', summary: 'Google has launched a new AI-powered search engine feature to improve user experience.' },
    { related: 'AMZN', source: 'SeekingAlpha', headline: 'Amazon expands grocery delivery', datetime: '1725459956', summary: 'Amazon has expanded its grocery delivery services to more cities.' },
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
