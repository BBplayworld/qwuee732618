import { defineEventHandler } from 'h3'
import { $fetch } from 'ohmyfetch'
import { useMarketOpen } from '~/composables/useMarketOpen'

// 전역 변수로 캐싱 데이터를 저장
let cache = new Map<string, {}>()
let cachedData: any[] | null = null
let cacheTimestamp: number | null = null
const CACHE_DURATION = 1000 * 300 // 3분
const { isMarketOpen } = useMarketOpen()
const tokenArr = [process.env.FINN_1_KEY, process.env.FINN_2_KEY, process.env.FINN_3_KEY]
const tokenIter = tokenArr[Symbol.iterator]()
let tokenKey = tokenIter.next().value

// 개발 데이터
const predefinedData = [
    { name: 'QQQ', marketCap: 2900, c: 370.15, dp: 0.52 },
    { name: 'VOO', marketCap: 2900, c: 420.35, dp: -0.12 },
    { name: 'AAPL', marketCap: 3200, c: 145.65, dp: 0.25 },
    { name: 'NVDA', marketCap: 3000, c: 290.55, dp: 1.23 },
    { name: 'MSFT', marketCap: 2800, c: 310.00, dp: 0.78 },
    { name: 'GOOG', marketCap: 2000, c: 2800.55, dp: -0.45 },
    { name: 'AMZN', marketCap: 1858, c: 3500.45, dp: 0.23 },
    { name: 'META', marketCap: 1335, c: 150.35, dp: 0.56 },
    { name: 'AVGO', marketCap: 774, c: 180.90, dp: -0.34 },
    { name: 'TSLA', marketCap: 703, c: 200.25, dp: 1.03 },
    { name: 'COST', marketCap: 350, c: 250.85, dp: -0.15 },
    { name: 'ASML', marketCap: 356, c: 280.30, dp: 1.12 },
    { name: 'NFLX', marketCap: 294, c: 450.50, dp: 0.89 },
    { name: 'AZN', marketCap: 268, c: 290.10, dp: 0.34 },
    { name: 'AMD', marketCap: 250, c: 110.75, dp: -0.25 },
    { name: 'ADBE', marketCap: 247, c: 570.00, dp: 0.67 },
    { name: 'QCOM', marketCap: 200, c: 180.45, dp: 0.45 },
]

export default defineEventHandler(async () => {
    const now = Date.now()

    // production 환경이 아니면 미리 정의된 데이터를 리턴
    if (process.env.NODE_ENV !== 'production') {
        return predefinedData
    }

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
    ]

    const call = async (symbol: any) => {
        const url = `https://finnhub.io/api/v1/quote?symbol=${symbol.name}`

        try {
            const response = await $fetch(url, {
                headers: {
                    'X-Finnhub-Token': tokenKey,
                    'Content-Type': 'application/json'
                }
            })

            const data = {
                name: symbol.name,
                marketCap: symbol.marketCap,
                c: response.c,
                dp: response.dp
            }

            cache.set(symbol.name, data)
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
                console.log('[ERR-stocks]', error)
                break
            }
        }
    }

    // 새로운 데이터를 캐시에 저장
    cachedData = result
    cacheTimestamp = now

    return result
})
