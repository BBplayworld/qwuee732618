import { defineEventHandler } from 'h3'
import { $fetch } from 'ohmyfetch'

// 전역 변수로 캐싱 데이터를 저장
let cachedStocks: any[] | null = null
let cacheTimestamp: number | null = null
const CACHE_DURATION = 1000 * 60 * 60 // 1시간

export default defineEventHandler(async () => {
    const now = Date.now()

    // 캐시가 유효한지 확인
    if (cachedStocks && cacheTimestamp && now - cacheTimestamp < CACHE_DURATION) {
        return cachedStocks
    }

    // 캐시가 유효하지 않다면 데이터를 다시 가져옴
    const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA'] // 필요한 주식 심볼들

    /*
    const requests = symbols.map(async (symbol) => {
        const url = `https://apidojo-yahoo-finance-v1.p.rapidapi.com/stock/v2/get-summary?symbol=${symbol}&region=US`

        const response = await $fetch(url, {
            headers: {
                'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
                'X-RapidAPI-Host': 'apidojo-yahoo-finance-v1.p.rapidapi.com'
            }
        })

        return {
            name: response.symbol,
            marketCap: response.summaryDetail.marketCap?.raw / 1e9 || 0, // 시가총액을 억 단위로 변환
            change: response.price.regularMarketchangePercent?.raw || 0 // 주식 상승률
        }
    })
        */

    // const stocks = await Promise.all(requests)


    const stocks = [{ name: 'AAPL', marketCap: 2457, change: 1.2 },
    { name: 'MSFT', marketCap: 2147, change: -0.8 },
    { name: 'GOOGL', marketCap: 1701, change: 0.5 },
    { name: 'AMZN', marketCap: 1622, change: -5.4 },
    { name: 'TSLA', marketCap: 600, change: 2.1 },
    { name: 'NVDA', marketCap: 500, change: 1.0 },
    { name: 'META', marketCap: 750, change: -0.3 },
    { name: 'BRK.B', marketCap: 644, change: 0.7 },
    { name: 'V', marketCap: 454, change: -0.6 },
    { name: 'JNJ', marketCap: 430, change: 10.5 },
    { name: 'WMT', marketCap: 421, change: -1.0 },
    { name: 'PG', marketCap: 343, change: 0.8 },
    { name: 'JPM', marketCap: 472, change: 1.3 },
    { name: 'MA', marketCap: 337, change: -0.5 },
    { name: 'UNH', marketCap: 455, change: 0.9 },
    { name: 'HD', marketCap: 309, change: -0.7 },
    { name: 'DIS', marketCap: 261, change: 1.6 },
    { name: 'PYPL', marketCap: 222, change: -2.2 },
    { name: 'NFLX', marketCap: 210, change: 0.4 },
    { name: 'INTC', marketCap: 197, change: -0.9 }
    ]

    // 새로운 데이터를 캐시에 저장
    cachedStocks = stocks
    cacheTimestamp = now

    return stocks
})
