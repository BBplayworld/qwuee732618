import { defineEventHandler } from 'h3'
import { $fetch } from 'ohmyfetch'
import { useMarketOpen } from '~/composables/useMarketOpen'
import { kv } from '@vercel/kv'

const DATA_KEY = 'stocks'
const DATA_TTL = 30
const DATA_TTL_PEEK = 25
const tokenArr = [process.env.FINN_1_KEY, process.env.FINN_2_KEY, process.env.FINN_3_KEY, process.env.FINN_4_KEY]
const tokenIter = tokenArr[Symbol.iterator]()
let tokenKey = tokenIter.next().value

const symbols = [
    { name: 'QQQ', marketCap: 2900, high52: 539.15, c: 487.82, dp: 1.3, percentageFrom52WeekHigh: -3.12 },
    { name: 'VOO', marketCap: 2900, high52: 551.73, c: 523.21, dp: 0.26, percentageFrom52WeekHigh: -0.69 },
    { name: 'AAPL', marketCap: 3200, high52: 255, c: 227.7, dp: 0.9, percentageFrom52WeekHigh: -4.02 },
    { name: 'NVDA', marketCap: 3000, high52: 149.77, c: 124.74, dp: 1.54, percentageFrom52WeekHigh: -11.38 },
    { name: 'MSFT', marketCap: 2800, high52: 468.35, c: 419.91, dp: 0.81, percentageFrom52WeekHigh: -10.34 },
    { name: 'GOOG', marketCap: 2000, high52: 193.31, c: 167.75, dp: 0.32, percentageFrom52WeekHigh: -13.22 },
    { name: 'AMZN', marketCap: 1858, high52: 233, c: 185.87, dp: 2.15, percentageFrom52WeekHigh: -7.62 },
    { name: 'META', marketCap: 1335, high52: 602.95, c: 582.77, dp: 0, percentageFrom52WeekHigh: -0.10 },
    { name: 'AVGO', marketCap: 774, high52: 251.88, c: 174.2, dp: 1.34, percentageFrom52WeekHigh: -5.92 },
    { name: 'TSLA', marketCap: 703, high52: 488.54, c: 245.45, dp: 1.99, percentageFrom52WeekHigh: -12.02 },
    { name: 'COST', marketCap: 350, high52: 962, c: 877.5, dp: 0.21, percentageFrom52WeekHigh: -4.51 },
    { name: 'ASML', marketCap: 356, high52: 1110.09, c: 839.57, dp: 0.86, percentageFrom52WeekHigh: -24.37 },
    { name: 'NFLX', marketCap: 294, high52: 941.75, c: 713.15, dp: 0.9, percentageFrom52WeekHigh: -1.29 },
    { name: 'AZN', marketCap: 268, high52: 87.68, c: 77.31, dp: -0.8, percentageFrom52WeekHigh: -11.83 },
    { name: 'AMD', marketCap: 250, high52: 227.3, c: 166.56, dp: 2.28, percentageFrom52WeekHigh: -26.72 },
    { name: 'ADBE', marketCap: 247, high52: 638.25, c: 509.33, dp: 1.1, percentageFrom52WeekHigh: -20.20 },
    { name: 'QCOM', marketCap: 200, high52: 230.63, c: 172.67, dp: 2.22, percentageFrom52WeekHigh: -25.13 },
]
let localCache: object[] = []

export default defineEventHandler(async () => {
    if (process.env.NODE_ENV !== 'production') {
        return symbols
    }

    const call = async (symbol: any) => {
        const url = `https://finnhub.io/api/v1/quote?symbol=${symbol.name}`

        try {
            const response = await $fetch(url, {
                headers: {
                    'X-Finnhub-Token': tokenKey,
                    'Content-Type': 'application/json'
                }
            })

            const percentage = ((response.c - symbol.high52) / symbol.high52) * 100

            const data = {
                name: symbol.name,
                marketCap: symbol.marketCap,
                c: response.c,
                dp: response.dp,
                high52: symbol.high52,
                percentageFrom52WeekHigh: percentage.toFixed(2) // 52주 최고가 대비 퍼센트 계산
            }

            return data
        } catch (error) {
            console.log('[ERR-stocks]', error)

            if (error.response?.status === 429 || error.response?.status === 401) {
                throw new Error('Rate limit exceeded') // 429 오류 발생 시 예외 처리
            } else {
                throw error // 다른 오류 발생 시 처리
            }
        }
    }

    const { isMarketOpen, isPeekTime } = useMarketOpen()

    if (localCache.length > 0) {
        return localCache
    }

    if (!isMarketOpen) {
        const requests = symbols.map(symbol => call(symbol))
        localCache = await Promise.all(requests)
        return localCache
    }

    if (process.env.IS_KV) {
        let stockCache: object[] = []
        try {
            stockCache = await kv.get(DATA_KEY) as object[]
            localCache = stockCache
        } catch (e) {
            return symbols
        }

        if (stockCache?.length > 0) {
            return stockCache
        }
    }

    let result: any[] | null = []
    let attempts = 0

    while (attempts < tokenArr.length) {
        try {
            const requests = symbols.map(symbol => call(symbol))
            result = await Promise.all(requests)
            break // 성공 시 루프 종료
        } catch (error) {
            if (error.message === 'Rate limit exceeded') {
                tokenKey = tokenIter.next().value || tokenArr[0] // 토큰 변경 및 재시도
                attempts++
            } else {
                console.log('[ERR-stocks-retry]', error)
                break
            }
        }
    }

    localCache = result

    if (process.env.IS_KV) {
        await kv.set(DATA_KEY, JSON.stringify(result), { ex: (isPeekTime ? DATA_TTL_PEEK : DATA_TTL) })
    }

    return result
})
