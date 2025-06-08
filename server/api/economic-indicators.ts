import { defineEventHandler } from 'h3'
import { $fetch } from 'ohmyfetch'
import { useMarketOpen } from '~/composables/useMarketOpen'
import dayjs from 'dayjs'
import { promises as fs } from 'fs'
import { join } from 'path'

// 환경에 따른 캐시 파일 경로 설정
const getCacheFilePath = (): string => {
  // Vercel 환경에서는 /tmp 디렉토리만 사용 가능
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    return '/tmp/economic-indicators-cache.json'
  }
  // 로컬 환경에서는 프로젝트 내 tmp 디렉토리 사용
  return join(process.cwd(), 'tmp', 'economic-indicators-cache.json')
}

const CACHE_FILE_PATH = getCacheFilePath()
const CACHE_TTL_MARKET_OPEN = 90 * 1000 // 마켓 오픈 시: 90초
const CACHE_TTL_MARKET_CLOSED = 12 * 60 * 60 * 1000 // 마켓 닫힘 시: 12시간

// 미리 정의된 데이터 (production 환경이 아닐 때 사용)
interface EconomicData {
  name: string
  displayName?: { en: string; ko: string; zh: string }
  date: string
  value: string
}

interface CacheData {
  data: EconomicData[]
  timestamp: number
}

// 메모리 캐시
let memoryCache: EconomicData[] = []
let lastFetchTime = 0

// 현재 마켓 상태에 따른 캐시 TTL 반환
function getCacheTTL(): number {
  const { isMarketOpen } = useMarketOpen()
  return isMarketOpen ? CACHE_TTL_MARKET_OPEN : CACHE_TTL_MARKET_CLOSED
}

// 파일 캐시 읽기
async function readFileCache(): Promise<EconomicData[] | null> {
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
async function writeFileCache(data: EconomicData[]): Promise<void> {
  try {
    // 캐시 디렉토리 생성 (필요시)
    const cacheDir = CACHE_FILE_PATH.includes('/tmp/') ? '/tmp' : join(process.cwd(), 'tmp')

    await fs.mkdir(cacheDir, { recursive: true })

    const cacheData: CacheData = {
      data,
      timestamp: Date.now(),
    }

    await fs.writeFile(CACHE_FILE_PATH, JSON.stringify(cacheData, null, 2))
    console.log(`[INFO] Economic indicators cache file saved to: ${CACHE_FILE_PATH}`)
  } catch (error) {
    console.warn('[WARN] Failed to write economic indicators cache file:', error)
  }
}

// 외부 API에서 경제 지표 데이터 가져오기
async function fetchEconomicData(startDate: string, endDate: string, transferUnit: (code: any, value: any) => string): Promise<EconomicData[]> {
  const requests = indicators.map(async (indicator) => {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${indicator.code}&api_key=${process.env.FRED_API_KEY}&file_type=json&observation_start=${startDate}&observation_end=${endDate}`

    try {
      const response = await $fetch(url)
      const latestObservation = response.observations.pop() // 가장 최신의 데이터를 사용

      return {
        name: indicator.displayName.en,
        displayName: indicator.displayName,
        date: latestObservation.date,
        value: transferUnit(indicator.code, latestObservation.value), // 지표 값
      }
    } catch (e) {
      console.log('[ERROR] Economic indicator API call failed:', e)
      return {
        name: indicator.displayName.en,
        displayName: indicator.displayName,
        date: '',
        value: '0',
      }
    }
  })

  return await Promise.all(requests)
}

const indicators = [
  {
    code: 'GDP',
    displayName: {
      en: 'Gross Domestic Product (GDP)',
      ko: '국내총생산 (GDP)',
      zh: '国内生产总值 (GDP)',
    },
    fallbackValue: '21.85B',
  },
  {
    code: 'UNRATE',
    displayName: {
      en: 'Unemployment Rate',
      ko: '실업률',
      zh: '失业率',
    },
    fallbackValue: '4.3%',
  },
  {
    code: 'CPIAUCSL',
    displayName: {
      en: 'CPI: All Items in U.S. City Average',
      ko: '소비자물가지수 (CPI)',
      zh: '消费者价格指数 (CPI)',
    },
    fallbackValue: '275.10 (1982-1984=100)',
  },
  {
    code: 'DFF',
    displayName: {
      en: 'Effective Federal Funds Rate',
      ko: '연방기금금리',
      zh: '联邦基金利率',
    },
    fallbackValue: '0.50%',
  },
  {
    code: 'INDPRO',
    displayName: {
      en: 'Industrial Production Index',
      ko: '산업생산지수',
      zh: '工业生产指数',
    },
    fallbackValue: '112.3 (2017=100)',
  },
  {
    code: 'PAYEMS',
    displayName: {
      en: 'Nonfarm Payrolls',
      ko: '비농업부문 고용지수',
      zh: '非农就业人数',
    },
    fallbackValue: '150.5M',
  },
  {
    code: 'DGS10',
    displayName: {
      en: '10-Year Treasury Constant Maturity Rate',
      ko: '10년 만기 국채 수익률',
      zh: '10年期国债收益率',
    },
    fallbackValue: '1.60%',
  },
  {
    code: 'M2SL',
    displayName: {
      en: 'M2 Money Stock',
      ko: 'M2 통화량',
      zh: 'M2货币供应量',
    },
    fallbackValue: '18.5B',
  },
  {
    code: 'RSAFS',
    displayName: {
      en: 'Retail Sales',
      ko: '소매판매',
      zh: '零售销售',
    },
    fallbackValue: '590.1M',
  },
  {
    code: 'BAA10YM',
    displayName: {
      en: "Moody's Baa Corporate Bond Yield Relative to 10-Year Treasury Yield",
      ko: '무디스 Baa 회사채 수익률 대비 10년 국채 수익률 차이',
      zh: '穆迪Baa公司债收益率相对于10年期国债收益率',
    },
    fallbackValue: '1.10%',
  },
  {
    code: 'HOUST',
    displayName: {
      en: 'Housing Starts',
      ko: '주택착공건수',
      zh: '新屋开工数',
    },
    fallbackValue: '1.60 Thousands of Units',
  },
  {
    code: 'CES0500000003',
    displayName: {
      en: 'Average Hourly Earnings of All Employees',
      ko: '평균 시간당 임금',
      zh: '平均时薪',
    },
    fallbackValue: '30.2 Dollars per Hour',
  },
  {
    code: 'A191RL1Q225SBEA',
    displayName: {
      en: 'Real Gross Domestic Product',
      ko: '실질 국내총생산',
      zh: '实际国내生产总值',
    },
    fallbackValue: '21.85B',
  },
]

// 기본값을 가진 indicators 기반 fallback 데이터 생성
function createFallbackData(): EconomicData[] {
  return indicators.map((indicator) => ({
    name: indicator.displayName.en,
    displayName: indicator.displayName,
    date: '2024-09-30',
    value: indicator.fallbackValue || '0',
  }))
}

export default defineEventHandler(async () => {
  const now = Date.now()

  // 1. 메모리 캐시 확인 (가장 빠름)
  if (memoryCache.length > 0 && now - lastFetchTime < getCacheTTL()) {
    console.log('[INFO] Economic indicators memory cache hit')
    return memoryCache
  }

  // 2. 파일 캐시 확인 (두 번째로 빠름)
  const fileCache = await readFileCache()
  if (fileCache) {
    console.log('[INFO] Economic indicators file cache hit')

    memoryCache = fileCache
    lastFetchTime = now
    return fileCache
  }

  const transferUnit = (code: any, value: any) => {
    let fixValue = (Math.trunc(value * 100) / 100).toLocaleString()
    switch (code) {
      case 'GDP':
      case 'A191RL1Q225SBEA':
      case 'M2SL':
        return `${fixValue}B`
      case 'RSAFS':
        return `${fixValue}M`
      case 'HOUST':
        return `${fixValue} Thousands of Units`
      case 'CES0500000003':
        return `${fixValue} Dollars per Hour`
      case 'DFF':
      case 'UNRATE':
      case 'DGS10':
      case 'BAA10YM':
        return `${fixValue}%`
      case 'CPIAUCSL':
        return `${fixValue} (1982-1984=100)`
      case 'INDPRO':
        return `${fixValue} (2017=100)`
      default:
        return fixValue
    }
  }

  const endDate = dayjs().format('YYYY-MM-DD')
  const startDate = dayjs().subtract(1, 'year').format('YYYY-MM-DD') // 1년 전 데이터 조회

  // 3. 외부 API 호출이 필요한 경우
  const { isMarketOpen } = useMarketOpen()
  const marketOpen = isMarketOpen

  // 마켓이 닫혀있을 때는 1회만 API 호출 후 12시간 캐시 사용
  if (!marketOpen) {
    try {
      console.log('[INFO] Market closed - Fetching fresh economic indicators from API (once)')
      const freshData = await fetchEconomicData(startDate, endDate, transferUnit)

      // 캐시 업데이트
      memoryCache = freshData
      lastFetchTime = now

      // 파일 캐시 저장 (비동기, 실패해도 응답에 영향 없음)
      writeFileCache(freshData).catch((err) => console.warn('[WARN] Failed to update economic indicators file cache:', err))

      return freshData
    } catch (error: any) {
      console.error('[ERROR] Failed to fetch economic indicators:', error?.message)

      // API 호출이 실패한 경우, 기존 fallback 데이터 반환
      return createFallbackData()
    }
  }

  // 마켓이 열려있을 때는 90초마다 API 호출
  try {
    console.log('[INFO] Market open - Fetching fresh economic indicators from API')
    const freshData = await fetchEconomicData(startDate, endDate, transferUnit)

    // 캐시 업데이트
    memoryCache = freshData
    lastFetchTime = now

    // 파일 캐시 저장 (비동기, 실패해도 응답에 영향 없음)
    writeFileCache(freshData).catch((err) => console.warn('[WARN] Failed to update economic indicators file cache:', err))

    return freshData
  } catch (error: any) {
    console.error('[ERROR] Failed to fetch economic indicators:', error?.message)

    // API 호출이 실패한 경우, 기존 fallback 데이터 반환
    return createFallbackData()
  }
})
