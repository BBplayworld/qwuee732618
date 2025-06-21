import { defineEventHandler } from 'h3'
import { useMarketOpen } from '~/composables/useMarketOpen'
import dayjs from 'dayjs'
import { readEconomicFileCache, writeEconomicFileCache, getEconomicCacheTTL, type EconomicData } from '~/server/utils/cache'

// 메모리 캐시
let memoryCache: EconomicData[] = []
let lastFetchTime = 0

// 외부 API에서 경제 지표 데이터 가져오기
async function fetchEconomicData(startDate: string, endDate: string, transferUnit: (code: any, value: any) => string): Promise<EconomicData[]> {
  const requests = indicators.map(async (indicator) => {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${indicator.code}&api_key=${process.env.FRED_API_KEY}&file_type=json&observation_start=${startDate}&observation_end=${endDate}`

    try {
      const response = await fetch(url)
      const data = (await response.json()) as any
      const latestObservation = data.observations.pop() // 가장 최신의 데이터를 사용

      return {
        name: indicator.displayName.en,
        displayName: indicator.displayName,
        date: latestObservation.date,
        value: transferUnit(indicator.code, latestObservation.value), // 지표 값
      }
    } catch (e: any) {
      console.error('[E7] FRED API failed:', e?.message)
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

  // 1. 메모리 캐시 확인
  if (memoryCache.length > 0 && now - lastFetchTime < getEconomicCacheTTL()) {
    console.log('[E1] Memory cache hit')
    return memoryCache
  }

  // 2. 파일 캐시 확인
  const fileCache = await readEconomicFileCache()
  if (fileCache) {
    console.log('[E2] File cache hit')
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

  if (!marketOpen) {
    try {
      console.log('[E3] Market closed - API fetch')
      const freshData = await fetchEconomicData(startDate, endDate, transferUnit)

      memoryCache = freshData
      lastFetchTime = now
      writeEconomicFileCache(freshData).catch(() => {}) // Silent fail

      return freshData
    } catch (error: any) {
      console.error('[E4] API fetch failed:', error?.message)
      return createFallbackData()
    }
  }

  try {
    console.log('[E5] Market open - API fetch')
    const freshData = await fetchEconomicData(startDate, endDate, transferUnit)

    memoryCache = freshData
    lastFetchTime = now
    writeEconomicFileCache(freshData).catch(() => {}) // Silent fail

    return freshData
  } catch (error: any) {
    console.error('[E6] API fetch failed:', error?.message)
    return createFallbackData()
  }
})
