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
  { name: 'QQQ', marketCap: 700, high52: 540.8, c: 468.94, dp: 1.3, percentageFrom52WeekHigh: -3.12, sector: 'ETF' },
  { name: 'VOO', marketCap: 700, high52: 563.85, c: 510.8, dp: 0.26, percentageFrom52WeekHigh: -0.69, sector: 'ETF' },
  { name: 'AAPL', marketCap: 700, high52: 260.09, c: 217.9, dp: 0.9, percentageFrom52WeekHigh: -4.02, sector: 'Technology' },
  { name: 'NVDA', marketCap: 700, high52: 153.13, c: 109.67, dp: 1.54, percentageFrom52WeekHigh: -11.38, sector: 'Technology' },
  { name: 'MSFT', marketCap: 700, high52: 468.35, c: 378.8, dp: 0.81, percentageFrom52WeekHigh: -10.34, sector: 'Technology' },
  { name: 'GOOG', marketCap: 700, high52: 208.7, c: 156.06, dp: 0.32, percentageFrom52WeekHigh: -13.22, sector: 'Technology' },
  { name: 'AMZN', marketCap: 700, high52: 242.52, c: 192.72, dp: 2.15, percentageFrom52WeekHigh: -7.62, sector: 'Consumer Discretionary' },
  { name: 'META', marketCap: 700, high52: 740.89, c: 576.74, dp: 0, percentageFrom52WeekHigh: -0.1, sector: 'Technology' },
  { name: 'AVGO', marketCap: 700, high52: 251.87, c: 169.12, dp: 1.34, percentageFrom52WeekHigh: -5.92, sector: 'Technology' },
  { name: 'TSLA', marketCap: 700, high52: 488.54, c: 263.55, dp: 1.99, percentageFrom52WeekHigh: -12.02, sector: 'Consumer Discretionary' },
  { name: 'COST', marketCap: 700, high52: 1078.23, c: 929.66, dp: 0.21, percentageFrom52WeekHigh: -4.51, sector: 'Consumer Staples' },
  { name: 'ASML', marketCap: 700, high52: 1110.09, c: 674.58, dp: 0.86, percentageFrom52WeekHigh: -24.37, sector: 'Technology' },
  { name: 'NFLX', marketCap: 700, high52: 1064.5, c: 933.85, dp: 0.9, percentageFrom52WeekHigh: -1.29, sector: 'Communication Services' },
  { name: 'AMD', marketCap: 700, high52: 187.28, c: 103.22, dp: 2.28, percentageFrom52WeekHigh: -26.72, sector: 'Technology' },
  { name: 'PLTR', marketCap: 700, high52: 125.41, c: 85.85, dp: 2.22, percentageFrom52WeekHigh: -25.13, sector: 'Technology' },
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
          'Content-Type': 'application/json',
        },
      })

      const percentage = ((response.c - symbol.high52) / symbol.high52) * 100

      const data = {
        name: symbol.name,
        marketCap: symbol.marketCap,
        c: response.c,
        dp: response.dp,
        high52: symbol.high52,
        percentageFrom52WeekHigh: percentage.toFixed(2), // 52주 최고가 대비 퍼센트 계산
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
    const requests = symbols.map((symbol) => call(symbol))
    localCache = await Promise.all(requests)
    return localCache
  }

  if (process.env.IS_KV) {
    let stockCache: object[] = []
    try {
      stockCache = (await kv.get(DATA_KEY)) as object[]
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
      const requests = symbols.map((symbol) => call(symbol))
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
    await kv.set(DATA_KEY, JSON.stringify(result), { ex: isPeekTime ? DATA_TTL_PEEK : DATA_TTL })
  }

  return result
})
