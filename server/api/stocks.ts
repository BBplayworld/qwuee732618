import { defineEventHandler } from 'h3'
import { $fetch } from 'ohmyfetch'
import { useMarketOpen } from '~/composables/useMarketOpen'

// 전역 변수로 캐싱 데이터를 저장
let cachedData: any[] | null = null
let cacheTimestamp: number | null = null
const CACHE_DURATION = 1000 * 65 // 1분 5초
const { isMarketOpen } = useMarketOpen()

export default defineEventHandler(async () => {
    const now = Date.now()

    if (cachedData && !isMarketOpen) {
        return cachedData
    }

    // 캐시가 유효한지 확인
    if (cachedData && cacheTimestamp && now - cacheTimestamp < CACHE_DURATION) {
        return cachedData
    }

    // 캐시가 유효하지 않다면 데이터를 다시 가져옴
    const symbols = [
        { name: 'QQQ', marketCap: 2900 },
        { name: 'VOO', marketCap: 2900 },
        { name: 'AAPL', marketCap: 3200 },
        { name: 'NVDA', marketCap: 3000 },
        { name: 'MSFT', marketCap: 2800 },
        { name: 'GOOG', marketCap: 2000 },
        { name: 'AMZN', marketCap: 1858 },
        { name: 'META', marketCap: 1335 },
        { name: 'AVGO', marketCap: 774 },
        { name: 'TSLA', marketCap: 703 },
        { name: 'COST', marketCap: 350 },
        { name: 'ASML', marketCap: 356 },
        { name: 'NFLX', marketCap: 294 },
        { name: 'AZN', marketCap: 268 },
        { name: 'AMD', marketCap: 250 },
        { name: 'ADBE', marketCap: 247 },
        { name: 'QCOM', marketCap: 200 },
    ] // 필요한 주식 심볼들

    const requests = symbols.map(async (symbol) => {
        const url = `https://finnhub.io/api/v1/quote?symbol=${symbol['name']}`

        try {
            const response = await $fetch(url, {
                headers: {
                    'X-Finnhub-Token': process.env.STOCK_KEY
                }
            })

            return {
                name: symbol['name'],
                marketCap: symbol['marketCap'],
                c: response['c'],
                dp: response['dp']
            }
        } catch (e) {
            return {
                name: symbol['name'],
                marketCap: symbol['marketCap'],
                c: 0,
                dp: 0
            }
        }
    })

    const result = await Promise.all(requests)

    // 새로운 데이터를 캐시에 저장
    cachedData = result
    cacheTimestamp = now

    return result
})
