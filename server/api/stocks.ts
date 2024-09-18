import { defineEventHandler } from 'h3'
import { $fetch } from 'ohmyfetch'
import { useMarketOpen } from '~/composables/useMarketOpen'
import { kv } from '@vercel/kv'

const INITIALIZED_KEY = 'stocks_init'
const DATA_KEY = 'stocks'
const DATA_TTL = 300
const DATA_CLOSED_TTL = 86400
const { isMarketOpen } = useMarketOpen()
const tokenArr = [process.env.FINN_1_KEY, process.env.FINN_2_KEY, process.env.FINN_3_KEY, process.env.FINN_4_KEY]
const tokenIter = tokenArr[Symbol.iterator]()
let tokenKey = tokenIter.next().value

// 개발 데이터
const predefinedData = [
    { name: 'QQQ', marketCap: 2900, c: 370.15, dp: 0.52, high52: 400.00, percentageFrom52WeekHigh: 1 },
    { name: 'VOO', marketCap: 2900, c: 420.35, dp: -0.12, high52: 450.00, percentageFrom52WeekHigh: 1 },
    { name: 'AAPL', marketCap: 3200, c: 145.65, dp: 0.25, high52: 180.00, percentageFrom52WeekHigh: -18.2 },
    { name: 'NVDA', marketCap: 3000, c: 290.55, dp: 1.23, high52: 330.00, percentageFrom52WeekHigh: -16 },
    { name: 'MSFT', marketCap: 2800, c: 310.00, dp: 0.78, high52: 350.00, percentageFrom52WeekHigh: 1 },
    { name: 'GOOG', marketCap: 2000, c: 2800.55, dp: -0.45, high52: 3000.00, percentageFrom52WeekHigh: 1 },
    { name: 'AMZN', marketCap: 1858, c: 3500.45, dp: 0.23, high52: 3800.00, percentageFrom52WeekHigh: 1 },
    { name: 'META', marketCap: 1335, c: 150.35, dp: 0.56, high52: 190.00, percentageFrom52WeekHigh: -0.2 },
    { name: 'AVGO', marketCap: 774, c: 180.90, dp: -0.34, high52: 200.00, percentageFrom52WeekHigh: 1 },
    { name: 'TSLA', marketCap: 703, c: 200.25, dp: 1.03, high52: 250.00, percentageFrom52WeekHigh: 1 },
    { name: 'COST', marketCap: 350, c: 250.85, dp: -0.15, high52: 270.00, percentageFrom52WeekHigh: -0.2 },
    { name: 'ASML', marketCap: 356, c: 280.30, dp: 1.12, high52: 320.00, percentageFrom52WeekHigh: 1 },
    { name: 'NFLX', marketCap: 294, c: 450.50, dp: 0.89, high52: 500.00, percentageFrom52WeekHigh: 1 },
    { name: 'AZN', marketCap: 268, c: 290.10, dp: 0.34, high52: 320.00, percentageFrom52WeekHigh: -0.2 },
    { name: 'AMD', marketCap: 250, c: 110.75, dp: -0.25, high52: 130.00, percentageFrom52WeekHigh: -0.2 },
    { name: 'ADBE', marketCap: 247, c: 570.00, dp: 0.67, high52: 600.00, percentageFrom52WeekHigh: -13 },
    { name: 'QCOM', marketCap: 200, c: 180.45, dp: 0.45, high52: 220.00, percentageFrom52WeekHigh: -0.2 },
]

const initializeCache = async () => {
    const initialData: never[] = []
    await kv.set(DATA_KEY, JSON.stringify(initialData))
}

export default defineEventHandler(async () => {
    if (process.env.NODE_ENV !== 'production') {
        return predefinedData
    }

    const cacheInitialized = await kv.get(INITIALIZED_KEY)

    if (isMarketOpen && !cacheInitialized) {
        console.log('initializeCache()')
        await initializeCache()
        await kv.set(INITIALIZED_KEY, 'true')
    }

    if (!isMarketOpen && cacheInitialized) {
        console.log('initialize()')
        await kv.set(INITIALIZED_KEY, 'false')
    }

    let stockCache: object[] = []
    try {
        stockCache = await kv.get(DATA_KEY) as object[]
    } catch (e) { }

    console.log('[api/stocks]', isMarketOpen, cacheInitialized, stockCache.length)

    if (stockCache?.length > 0) {
        return stockCache
    }

    const symbols = [
        { name: 'QQQ', marketCap: 2900, high52: 503.52 },
        { name: 'VOO', marketCap: 2900, high52: 519.4 },
        { name: 'AAPL', marketCap: 3200, high52: 237.23 },
        { name: 'NVDA', marketCap: 3000, high52: 140.76 },
        { name: 'MSFT', marketCap: 2800, high52: 468.35 },
        { name: 'GOOG', marketCap: 2000, high52: 193.31 },
        { name: 'AMZN', marketCap: 1858, high52: 201.2 },
        { name: 'META', marketCap: 1335, high52: 544.23 },
        { name: 'AVGO', marketCap: 774, high52: 185.16 },
        { name: 'TSLA', marketCap: 703, high52: 278.98 },
        { name: 'COST', marketCap: 350, high52: 918.93 },
        { name: 'ASML', marketCap: 356, high52: 1110.09 },
        { name: 'NFLX', marketCap: 294, high52: 711.33 },
        { name: 'AZN', marketCap: 268, high52: 87.68 },
        { name: 'AMD', marketCap: 250, high52: 227.3 },
        { name: 'ADBE', marketCap: 247, high52: 638.25 },
        { name: 'QCOM', marketCap: 200, high52: 230.63 },
    ];

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

    // 새로운 데이터를 캐시에 저장
    if (!isMarketOpen) {
        await kv.set(DATA_KEY, JSON.stringify(result), { ex: DATA_CLOSED_TTL })
        return result
    }

    await kv.set(DATA_KEY, JSON.stringify(result), { ex: DATA_TTL })
    return result
})
