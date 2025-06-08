import { defineEventHandler } from 'h3'
import { $fetch } from 'ohmyfetch'
import { useMarketOpen } from '~/composables/useMarketOpen'
import { promises as fs } from 'fs'
import { join } from 'path'

const CACHE_FILE_PATH = join(process.cwd(), 'data', 'stocks-cache.json')
const CACHE_TTL_MARKET_OPEN = 90 * 1000 // 마켓 오픈 시: 90초
const CACHE_TTL_MARKET_CLOSED = 12 * 60 * 60 * 1000 // 마켓 닫힘 시: 12시간
const tokenArr = [process.env.FINN_1_KEY, process.env.FINN_2_KEY, process.env.FINN_3_KEY, process.env.FINN_4_KEY].filter((token): token is string => Boolean(token)) // undefined 값 제거

let currentTokenIndex = 0

const symbols = [
  { name: 'QQQ', marketCap: 3415, high52: 540.81, c: 529.92, dp: 0.95, percentageFrom52WeekHigh: -2.02, sector: 'ETF', displayName: { en: 'QQQ Trust', ko: 'QQQ 트러스트', zh: 'QQQ信托' } },
  { name: 'VOO', marketCap: 531.8, high52: 563.92, c: 550.66, dp: 1.03, percentageFrom52WeekHigh: -2.34, sector: 'ETF', displayName: { en: 'VOO ETF', ko: 'VOO ETF', zh: 'VOO ETF' } },

  { name: 'AAPL', marketCap: 32807, high52: 260.09, c: 203.92, dp: 1.62, percentageFrom52WeekHigh: -21.6, sector: 'Technology', displayName: { en: 'Apple', ko: '애플', zh: '苹果' } },
  { name: 'NVDA', marketCap: 34600, high52: 153.13, c: 141.72, dp: 1.19, percentageFrom52WeekHigh: -7.38, sector: 'Technology', displayName: { en: 'NVIDIA', ko: '엔비디아', zh: '英伟达' } },
  { name: 'MSFT', marketCap: 27906, high52: 473.28, c: 470.38, dp: 0.54, percentageFrom52WeekHigh: -0.62, sector: 'Technology', displayName: { en: 'Microsoft', ko: '마이크로소프트', zh: '微软' } },
  { name: 'GOOG', marketCap: 18765, high52: 175.76, c: 174.92, dp: 3.0, percentageFrom52WeekHigh: -0.48, sector: 'Technology', displayName: { en: 'Alphabet', ko: '알파벳', zh: '谷歌' } },
  { name: 'AMZN', marketCap: 10872, high52: 246.42, c: 213.57, dp: 2.71, percentageFrom52WeekHigh: -13.33, sector: 'Consumer Discretionary', displayName: { en: 'Amazon', ko: '아마존', zh: '亚马逊' } },
  { name: 'META', marketCap: 14603, high52: 702.41, c: 697.71, dp: 1.91, percentageFrom52WeekHigh: -0.69, sector: 'Technology', displayName: { en: 'Meta', ko: '메타', zh: '脸书' } },
  { name: 'AVGO', marketCap: 3418, high52: 255.2, c: 246.93, dp: -5.0, percentageFrom52WeekHigh: -3.29, sector: 'Technology', displayName: { en: 'Broadcom', ko: '브로드컴', zh: '博通' } },
  { name: 'TSLA', marketCap: 9506, high52: 305.41, c: 295.14, dp: 3.67, percentageFrom52WeekHigh: -3.29, sector: 'AI & Autonomous Driving', displayName: { en: 'Tesla', ko: '테슬라', zh: '特斯拉' } },

  { name: 'COST', marketCap: 8437, high52: 1021.0, c: 1014.94, dp: 0.36, percentageFrom52WeekHigh: -0.61, sector: 'Consumer Staples', displayName: { en: 'Costco', ko: '코스트코', zh: '好市多' } },
  { name: 'ASML', marketCap: 22744, high52: 762.11, c: 753.02, dp: 0.7, percentageFrom52WeekHigh: -1.18, sector: 'Technology', displayName: { en: 'ASML', ko: 'ASML', zh: '阿斯麦' } },
  { name: 'NFLX', marketCap: 27516, high52: 1261.0, c: 1241.48, dp: -0.71, percentageFrom52WeekHigh: -1.55, sector: 'Communication Services', displayName: { en: 'Netflix', ko: '넷플릭스', zh: '网飞' } },
  { name: 'AMD', marketCap: 14001, high52: 118.36, c: 116.19, dp: 0.4, percentageFrom52WeekHigh: -1.8, sector: 'Technology', displayName: { en: 'AMD', ko: 'AMD', zh: '超威' } },
  { name: 'PLTR', marketCap: 5.55, high52: 128.11, c: 127.72, dp: 6.5, percentageFrom52WeekHigh: -0.31, sector: 'Technology', displayName: { en: 'Palantir', ko: '팔란티어', zh: '帕兰提尔' } },

  { name: 'VZ', marketCap: 240, high52: 43.91, c: 43.8, dp: 1.13, percentageFrom52WeekHigh: -0.25, sector: 'Communication Services', displayName: { en: 'Verizon', ko: '버라이즌', zh: '威瑞森' } },
  { name: 'WMT', marketCap: 4090, high52: 98.55, c: 97.47, dp: -0.53, percentageFrom52WeekHigh: -1.07, sector: 'Consumer Staples', displayName: { en: 'Walmart', ko: '월마트', zh: '沃尔玛' } },

  { name: 'JPM', marketCap: 7385, high52: 266.65, c: 265.73, dp: 1.44, percentageFrom52WeekHigh: -0.34, sector: 'Financials', displayName: { en: 'JPMorgan', ko: 'JP모건', zh: '摩根' } },
  { name: 'BAC', marketCap: 2969, high52: 45.16, c: 44.97, dp: 1.32, percentageFrom52WeekHigh: -0.43, sector: 'Financials', displayName: { en: 'BofA', ko: '뱅크오브아메리카', zh: '美国银行' } },

  { name: 'NEE', marketCap: 1485, high52: 72.29, c: 72.16, dp: 0.88, percentageFrom52WeekHigh: -0.18, sector: 'Utilities', displayName: { en: 'NextEra', ko: '넥스트에라', zh: '未来能源' } },

  { name: 'IONQ', marketCap: 1015, high52: 54.74, c: 39.02, dp: 6.38, percentageFrom52WeekHigh: -28.72, sector: 'Technology', displayName: { en: 'IonQ', ko: '아이온큐', zh: 'IonQ' } },
  { name: 'TEM', marketCap: 1075, high52: 91.45, c: 62.07, dp: 5.74, percentageFrom52WeekHigh: -32.11, sector: 'Healthcare', displayName: { en: 'Tempus', ko: '템퍼스', zh: 'Tempus' } },
  { name: 'JOBY', marketCap: 643, high52: 10.72, c: 8.12, dp: 3, percentageFrom52WeekHigh: -10, sector: 'Industrials', displayName: { en: 'Joby', ko: '조비', zh: '乔比' } },
  { name: 'RKLB', marketCap: 1334, high52: 33.34, c: 28.92, dp: 7.59, percentageFrom52WeekHigh: -13.31, sector: 'Aerospace', displayName: { en: 'Rocket Lab', ko: '로켓랩', zh: '火箭实验室' } },
  { name: 'SMR', marketCap: 458, high52: 36.85, c: 34.36, dp: 3.33, percentageFrom52WeekHigh: -6.78, sector: 'Nuclear/Energy', displayName: { en: 'NuScale SMR', ko: '누스케일 SMR', zh: 'NuScale 小型模块化反应堆' } },
  { name: 'TSM', marketCap: 6047, high52: 226.4, c: 205.18, dp: 0.8, percentageFrom52WeekHigh: -9.35, sector: 'Technology', displayName: { en: 'TSMC', ko: 'TSMC', zh: '台积电' } },

  { name: 'SCHD', marketCap: 681, high52: 29.72, c: 26.54, dp: 1.18, percentageFrom52WeekHigh: -10.74, sector: 'ETF', displayName: { en: 'SCHD Dividend ETF', ko: '미국 배당주 슈왑 ETF', zh: '美国分红股SCHD ETF' } },
  { name: 'JEPQ', marketCap: 264, high52: 58.54, c: 52.7, dp: 0.69, percentageFrom52WeekHigh: -9.96, sector: 'ETF', displayName: { en: 'JEPQ Nasdaq Div ETF', ko: '나스닥 100 JP모건 고배당 ETF', zh: '纳斯达克JP摩根高股息ETF' } },
  { name: 'IEF', marketCap: 100, high52: 100, c: 93.51, dp: -0.77, percentageFrom52WeekHigh: 100, sector: 'ETF', displayName: { en: '7–10Y Treasury', ko: '미국 국채 7–10년', zh: '美国国债7-10年' } },
  { name: 'TLT', marketCap: 100, high52: 100, c: 85.35, dp: -1.27, percentageFrom52WeekHigh: 100, sector: 'ETF', displayName: { en: '20Y+ Treasury', ko: '미국 국채 20년 이상', zh: '美国国债 20年以上' } },
  { name: 'GLD', marketCap: 1003, high52: 317.63, c: 305.18, dp: -4.15, percentageFrom52WeekHigh: -3.93, sector: 'ETF', displayName: { en: 'Gold SPDR', ko: '금 ETF', zh: '黄金ETF' } },
]

interface StockData {
  name: string
  marketCap: number
  c: number
  dp: number
  high52: number
  percentageFrom52WeekHigh: number
  sector: string
  displayName: { en: string; ko: string; zh: string }
}

interface CacheData {
  data: StockData[]
  timestamp: number
}

// 메모리 캐시
let memoryCache: StockData[] = []
let lastFetchTime = 0

// 현재 마켓 상태에 따른 캐시 TTL 반환
function getCacheTTL(): number {
  const { isMarketOpen } = useMarketOpen()
  return isMarketOpen ? CACHE_TTL_MARKET_OPEN : CACHE_TTL_MARKET_CLOSED
}

// 현재 토큰 가져오기
function getCurrentToken(): string {
  if (tokenArr.length === 0) {
    throw new Error('No API tokens available')
  }
  return tokenArr[currentTokenIndex % tokenArr.length]
}

// 다음 토큰으로 순환
function rotateToken(): void {
  currentTokenIndex = (currentTokenIndex + 1) % tokenArr.length
}

// 파일 캐시 읽기
async function readFileCache(): Promise<StockData[] | null> {
  try {
    const data = await fs.readFile(CACHE_FILE_PATH, 'utf-8')
    const cacheData: CacheData = JSON.parse(data)

    // 캐시가 유효한지 확인 (마켓 상태에 따른 TTL)
    if (Date.now() - cacheData.timestamp < getCacheTTL()) {
      return cacheData.data
    }
    return null
  } catch (error) {
    // 파일이 없거나 읽을 수 없는 경우
    return null
  }
}

// 파일 캐시 저장
async function writeFileCache(data: StockData[]): Promise<void> {
  try {
    // data 디렉토리가 없으면 생성
    const dataDir = join(process.cwd(), 'data')
    await fs.mkdir(dataDir, { recursive: true })

    const cacheData: CacheData = {
      data,
      timestamp: Date.now(),
    }

    await fs.writeFile(CACHE_FILE_PATH, JSON.stringify(cacheData, null, 2))
  } catch (error) {
    console.warn('[WARN] Failed to write cache file:', error)
  }
}

// 외부 API 호출
async function fetchStockData(symbol: any): Promise<StockData> {
  const url = `https://finnhub.io/api/v1/quote?symbol=${symbol.name}`

  const response = await $fetch(url, {
    headers: {
      'X-Finnhub-Token': getCurrentToken(),
      'Content-Type': 'application/json',
    },
  })

  const percentage = ((response.c - symbol.high52) / symbol.high52) * 100

  return {
    name: symbol.name,
    marketCap: symbol.marketCap,
    c: response.c,
    dp: response.dp,
    high52: symbol.high52,
    percentageFrom52WeekHigh: parseFloat(percentage.toFixed(2)),
    sector: symbol.sector,
    displayName: symbol.displayName,
  }
}

// 모든 주식 데이터 가져오기 (토큰 순환 포함)
async function fetchAllStockData(): Promise<StockData[]> {
  let attempts = 0

  while (attempts < tokenArr.length) {
    try {
      const requests = symbols.map((symbol) => fetchStockData(symbol))
      const result = await Promise.all(requests)
      return result
    } catch (error: any) {
      console.log(`[INFO] API call failed with token ${currentTokenIndex + 1}:`, error?.message)

      // 429 (Rate Limit) 또는 401 (Unauthorized) 에러인 경우 토큰 순환
      if (error?.response?.status === 429 || error?.response?.status === 401) {
        rotateToken()
        attempts++

        if (attempts < tokenArr.length) {
          console.log(`[INFO] Rotating to token ${currentTokenIndex + 1}, attempt ${attempts + 1}`)
          continue
        }
      }

      throw new Error(`Failed to fetch stock data after ${attempts + 1} attempts`)
    }
  }

  throw new Error('All API tokens exhausted')
}

export default defineEventHandler(async () => {
  const now = Date.now()

  // 1. 메모리 캐시 확인 (가장 빠름)
  if (memoryCache.length > 0 && now - lastFetchTime < getCacheTTL()) {
    console.log('[INFO] Memory cache hit')
    return memoryCache
  }

  // 2. 파일 캐시 확인 (두 번째로 빠름)
  const fileCache = await readFileCache()
  if (fileCache) {
    console.log('[INFO] File cache hit')

    memoryCache = fileCache
    lastFetchTime = now
    return fileCache
  }

  // 3. 외부 API 호출이 필요한 경우
  const { isMarketOpen } = useMarketOpen()
  const marketOpen = isMarketOpen

  // 마켓이 닫혀있을 때는 1회만 API 호출 후 12시간 캐시 사용
  if (!marketOpen) {
    try {
      console.log('[INFO] Market closed - Fetching fresh stock data from API (once)')
      const freshData = await fetchAllStockData()

      // 캐시 업데이트
      memoryCache = freshData
      lastFetchTime = now

      // 파일 캐시 저장 (비동기, 실패해도 응답에 영향 없음)
      writeFileCache(freshData).catch((err) => console.warn('[WARN] Failed to update file cache:', err))

      return freshData
    } catch (error: any) {
      console.error('[ERROR] Failed to fetch stock data:', error?.message)

      // API 호출이 실패한 경우, 기존 symbols 데이터라도 반환
      return symbols
    }
  }

  // 마켓이 열려있을 때는 90초마다 API 호출
  try {
    console.log('[INFO] Market open - Fetching fresh stock data from API')
    const freshData = await fetchAllStockData()

    // 캐시 업데이트
    memoryCache = freshData
    lastFetchTime = now

    // 파일 캐시 저장 (비동기, 실패해도 응답에 영향 없음)
    writeFileCache(freshData).catch((err) => console.warn('[WARN] Failed to update file cache:', err))

    return freshData
  } catch (error: any) {
    console.error('[ERROR] Failed to fetch stock data:', error?.message)

    // API 호출이 실패한 경우, 기존 symbols 데이터라도 반환
    return symbols
  }
})
