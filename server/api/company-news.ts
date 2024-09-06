import { defineEventHandler } from 'h3'
import { $fetch } from 'ohmyfetch'
import dayjs from 'dayjs'
import { useMarketOpen } from '~/composables/useMarketOpen'

// 전역 변수로 캐시 데이터를 저장 (각 심볼별로 캐싱)
let cache = new Map<string, { data: any[] }>()
let cacheTimestamp: number

const CACHE_DURATION = 1000 * 600 * 3 // 30분
const { isMarketOpen } = useMarketOpen()

// 미리 정의된 뉴스 데이터 (production 환경이 아닐 때 사용)
const predefinedNews = [
    { related: 'AAPL', source: 'Yahoo', headline: 'Apple launches new iPhone model', datetime: '1725459956', summary: 'Apple announced its latest iPhone model, featuring new camera improvements.' },
    { related: 'MSFT', source: 'SeekingAlpha', headline: 'Microsoft acquires AI startup', datetime: '1725459956', summary: 'Microsoft has acquired an AI startup to enhance its cloud offerings.' },
    { related: 'GOOG', source: 'Yahoo', headline: 'Google introduces AI-powered search', datetime: '1725459956', summary: 'Google has launched a new AI-powered search engine feature to improve user experience.' },
    { related: 'AMZN', source: 'SeekingAlpha', headline: 'Amazon expands grocery delivery', datetime: '1725459956', summary: 'Amazon has expanded its grocery delivery services to more cities.' },
]

export default defineEventHandler(async () => {
    const now = Date.now()

    // production 환경이 아닐 때 미리 정의된 뉴스 데이터를 리턴
    if (process.env.NODE_ENV !== 'production') {
        return predefinedNews
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
        const cacheKey = symbol.name
        const cached = cache.get(cacheKey)

        // 캐시가 유효하고 시장이 닫혀 있으면 캐시된 데이터 사용
        if ((cached && !isMarketOpen) || (cached && now - cacheTimestamp < CACHE_DURATION)) {
            let ranIdx = Math.floor(Math.random() * cached.data.length)
            return cached.data.length > 0 ? cached.data[ranIdx] : {}
        }

        // 캐시가 유효하지 않다면 데이터를 다시 가져옴
        const url = `https://finnhub.io/api/v1/company-news?symbol=${symbol['name']}&from=${from}&to=${to}`

        try {
            const response = await $fetch(url, {
                headers: {
                    'X-Finnhub-Token': process.env.FINN_2_KEY,
                    'Content-Type': 'application/json',
                    'Accept-Charset': 'utf-8',
                }
            });

            // 새로운 데이터를 캐시에 저장
            cache.set(cacheKey, { data: response })

            let ranIdx = Math.floor(Math.random() * response.length)
            return response[ranIdx]
        } catch (e) {
            return {}
        }
    })

    let result = await Promise.all(requests)
    result = result.filter(item => (item)) // 빈 객체 제거
    result = result.sort(() => Math.random() - 0.5)
    cacheTimestamp = now

    return result;
})
