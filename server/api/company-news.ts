import { defineEventHandler } from 'h3'
import { $fetch } from 'ohmyfetch'
import dayjs from 'dayjs'

// 전역 변수로 캐싱 데이터를 저장
let cachedStocks: any[] | null = null
let cacheTimestamp: number | null = null
const CACHE_DURATION = 1000 * 120 // 1분 5초

export default defineEventHandler(async () => {
    const now = Date.now()
    const hours = new Date().getHours()

    if (cachedStocks && hours < 22) {
        return cachedStocks
    }

    // 캐시가 유효한지 확인
    if (cachedStocks && cacheTimestamp && now - cacheTimestamp < CACHE_DURATION) {
        return cachedStocks
    }

    // 캐시가 유효하지 않다면 데이터를 다시 가져옴
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

    let from = dayjs().format('YYYY-MM-DD')
    let to = dayjs().add(1, 'day').format('YYYY-MM-DD')

    if (hours >= 24 || hours < 20) {
        from = dayjs().add(-1, 'day').format('YYYY-MM-DD')
        to = dayjs().format('YYYY-MM-DD')
    }

    const requests = symbols.map(async (symbol) => {
        const url = `https://finnhub.io/api/v1/company-news?symbol=${symbol['name']}&from=${from}&to=${to}`

        let response
        try {
            response = await $fetch(url, {
                headers: {
                    'X-Finnhub-Token': process.env.STOCK_KEY
                }
            })

            let ranIdx = Math.floor(Math.random() * response.length)

            return {
                name: symbol['name'],
                headline: response[ranIdx]['headline'],
                source: response[ranIdx]['source'],
                summary: response[ranIdx]['summary'],
                datetime: response[ranIdx]['datetime'],
            }
        } catch (e) {
            return {
            }
        }
    })

    const result = await Promise.all(requests)

    // 새로운 데이터를 캐시에 저장
    cachedStocks = result
    cacheTimestamp = now

    return result
})
