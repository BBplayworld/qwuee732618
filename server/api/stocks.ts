import { defineEventHandler, getQuery } from 'h3'
import { useMarketOpen } from '~/composables/useMarketOpen'
import { readFileCache, writeFileCache, getCacheTTL, readUpdateState, writeUpdateState, checkAndResetForMarketStateChange, tryStartUpdate, markUpdateCompleted, incrementCallCountAndCheck } from '~/server/utils/cache'

const tokenArr = [process.env.FINN_1_KEY, process.env.FINN_2_KEY, process.env.FINN_3_KEY, process.env.FINN_4_KEY].filter((token): token is string => Boolean(token))

let currentTokenIndex = 0

interface StockData {
  name: string
  marketCap: number
  c: number
  dp: number
  high52: number
  percentageFrom52WeekHigh: number
  sector: string
  displayName: { en: string; ko: string; zh: string }
  timestamp?: number
}

// 심볼 데이터 정의
const symbols: StockData[] = [
  // Technology Sector
  { name: 'AAPL', marketCap: 2800000, c: 175.04, dp: 0.51, high52: 199.62, percentageFrom52WeekHigh: -12.3, sector: 'Technology', displayName: { en: 'Apple Inc.', ko: '애플', zh: '苹果公司' } },
  { name: 'MSFT', marketCap: 3200000, c: 465.28, dp: 0.71, high52: 475.0, percentageFrom52WeekHigh: -2.05, sector: 'Technology', displayName: { en: 'Microsoft', ko: '마이크로소프트', zh: '微软' } },
  { name: 'NVDA', marketCap: 2800000, c: 1125.48, dp: 0.02, high52: 1199.0, percentageFrom52WeekHigh: -6.13, sector: 'Technology', displayName: { en: 'NVIDIA', ko: '엔비디아', zh: '英伟达' } },
  { name: 'GOOGL', marketCap: 2200000, c: 175.35, dp: 0.46, high52: 182.0, percentageFrom52WeekHigh: -3.65, sector: 'Technology', displayName: { en: 'Alphabet', ko: '알파벳', zh: '字母表' } },
  { name: 'META', marketCap: 1200000, c: 485.58, dp: 0.42, high52: 531.49, percentageFrom52WeekHigh: -8.64, sector: 'Technology', displayName: { en: 'Meta Platforms', ko: '메타', zh: '元平台' } },
  { name: 'TSLA', marketCap: 650000, c: 325.31, dp: 0.0, high52: 488.54, percentageFrom52WeekHigh: -33.4, sector: 'Technology', displayName: { en: 'Tesla', ko: '테슬라', zh: '特斯拉' } },
  { name: 'AMD', marketCap: 280000, c: 178.72, dp: 0.0, high52: 227.3, percentageFrom52WeekHigh: -21.4, sector: 'Technology', displayName: { en: 'AMD', ko: 'AMD', zh: 'AMD' } },
  { name: 'INTC', marketCap: 180000, c: 43.31, dp: 1.39, high52: 51.28, percentageFrom52WeekHigh: -15.5, sector: 'Technology', displayName: { en: 'Intel', ko: '인텔', zh: '英特尔' } },
  // 추가된 유망 기술 기업들
  { name: 'IONQ', marketCap: 1800, c: 8.45, dp: 0.0, high52: 21.6, percentageFrom52WeekHigh: -60.9, sector: 'Technology', displayName: { en: 'IonQ', ko: '아이온큐', zh: '离子量子' } },
  { name: 'RGTI', marketCap: 1200, c: 2.85, dp: 0.0, high52: 5.4, percentageFrom52WeekHigh: -47.2, sector: 'Technology', displayName: { en: 'Rigetti Computing', ko: '리게티 컴퓨팅', zh: '里格蒂计算' } },
  { name: 'RKLB', marketCap: 2200, c: 4.25, dp: 0.0, high52: 8.05, percentageFrom52WeekHigh: -47.2, sector: 'Technology', displayName: { en: 'Rocket Lab', ko: '로켓랩', zh: '火箭实验室' } },
  { name: 'PLTR', marketCap: 52000, c: 24.85, dp: 0.0, high52: 25.24, percentageFrom52WeekHigh: -1.5, sector: 'Technology', displayName: { en: 'Palantir', ko: '팔란티어', zh: '帕兰提尔' } },
  // 추가된 상위 시가총액 기술 기업들
  { name: 'AVGO', marketCap: 680000, c: 1485.25, dp: 0.85, high52: 1520.0, percentageFrom52WeekHigh: -2.3, sector: 'Technology', displayName: { en: 'Broadcom', ko: '브로드컴', zh: '博通' } },
  { name: 'ORCL', marketCap: 420000, c: 152.45, dp: 1.25, high52: 165.0, percentageFrom52WeekHigh: -7.6, sector: 'Technology', displayName: { en: 'Oracle', ko: '오라클', zh: '甲骨文' } },
  { name: 'CRM', marketCap: 285000, c: 295.67, dp: 0.92, high52: 315.0, percentageFrom52WeekHigh: -6.1, sector: 'Technology', displayName: { en: 'Salesforce', ko: '세일즈포스', zh: '赛富时' } },
  { name: 'ADBE', marketCap: 245000, c: 535.28, dp: 0.68, high52: 575.0, percentageFrom52WeekHigh: -6.9, sector: 'Technology', displayName: { en: 'Adobe', ko: '어도비', zh: '奥多比' } },
  { name: 'NFLX', marketCap: 195000, c: 445.85, dp: 1.15, high52: 485.0, percentageFrom52WeekHigh: -8.1, sector: 'Technology', displayName: { en: 'Netflix', ko: '넷플릭스', zh: '奈飞' } },

  // Healthcare (8)
  { name: 'JNJ', marketCap: 400000, c: 158.92, dp: 2.85, high52: 180.25, percentageFrom52WeekHigh: -11.8, sector: 'Healthcare', displayName: { en: 'Johnson & Johnson', ko: '존슨앤존슨', zh: '强生' } },
  { name: 'UNH', marketCap: 480000, c: 495.67, dp: 1.48, high52: 560.15, percentageFrom52WeekHigh: -11.5, sector: 'Healthcare', displayName: { en: 'UnitedHealth', ko: '유나이티드헬스', zh: '联合健康' } },
  { name: 'PFE', marketCap: 160000, c: 28.45, dp: 6.25, high52: 42.18, percentageFrom52WeekHigh: -32.6, sector: 'Healthcare', displayName: { en: 'Pfizer', ko: '화이자', zh: '辉瑞' } },
  { name: 'MRK', marketCap: 340000, c: 128.95, dp: 2.48, high52: 135.25, percentageFrom52WeekHigh: -4.7, sector: 'Healthcare', displayName: { en: 'Merck', ko: '머크', zh: '默克' } },
  { name: 'ABBV', marketCap: 310000, c: 165.28, dp: 3.58, high52: 188.45, percentageFrom52WeekHigh: -12.3, sector: 'Healthcare', displayName: { en: 'AbbVie', ko: '애브비', zh: '艾伯维' } },
  { name: 'LLY', marketCap: 780000, c: 785.45, dp: 0.76, high52: 825.0, percentageFrom52WeekHigh: -4.8, sector: 'Healthcare', displayName: { en: 'Eli Lilly', ko: '일라이릴리', zh: '礼来' } },
  { name: 'TMO', marketCap: 220000, c: 555.67, dp: 0.3, high52: 610.25, percentageFrom52WeekHigh: -8.9, sector: 'Healthcare', displayName: { en: 'Thermo Fisher', ko: '써모피셔', zh: '赛默飞' } },
  { name: 'DHR', marketCap: 200000, c: 255.28, dp: 0.69, high52: 285.0, percentageFrom52WeekHigh: -10.4, sector: 'Healthcare', displayName: { en: 'Danaher', ko: '다나허', zh: '丹纳赫' } },

  // Financial (7)
  { name: 'JPM', marketCap: 550000, c: 195.45, dp: 2.35, high52: 205.25, percentageFrom52WeekHigh: -4.8, sector: 'Financial', displayName: { en: 'JPMorgan Chase', ko: 'JP모건', zh: '摩根大通' } },
  { name: 'BAC', marketCap: 290000, c: 36.28, dp: 2.75, high52: 38.95, percentageFrom52WeekHigh: -6.9, sector: 'Financial', displayName: { en: 'Bank of America', ko: '뱅크오브아메리카', zh: '美国银行' } },
  { name: 'WFC', marketCap: 180000, c: 45.67, dp: 1.85, high52: 52.15, percentageFrom52WeekHigh: -12.4, sector: 'Financial', displayName: { en: 'Wells Fargo', ko: '웰스파고', zh: '富国银行' } },
  { name: 'GS', marketCap: 125000, c: 365.28, dp: 0.95, high52: 415.0, percentageFrom52WeekHigh: -12.0, sector: 'Financial', displayName: { en: 'Goldman Sachs', ko: '골드만삭스', zh: '高盛' } },
  { name: 'MS', marketCap: 145000, c: 85.45, dp: 1.25, high52: 95.0, percentageFrom52WeekHigh: -10.1, sector: 'Financial', displayName: { en: 'Morgan Stanley', ko: '모건스탠리', zh: '摩根士丹利' } },
  { name: 'AXP', marketCap: 135000, c: 185.67, dp: 0.85, high52: 205.0, percentageFrom52WeekHigh: -9.4, sector: 'Financial', displayName: { en: 'American Express', ko: '아메리칸익스프레스', zh: '美国运通' } },
  { name: 'BRK-B', marketCap: 890000, c: 425.28, dp: 0.45, high52: 465.0, percentageFrom52WeekHigh: -8.5, sector: 'Financial', displayName: { en: 'Berkshire Hathaway', ko: '버크셔해서웨이', zh: '伯克希尔哈撒韦' } },

  // Consumer (7)
  { name: 'AMZN', marketCap: 1850000, c: 178.25, dp: 0.85, high52: 201.2, percentageFrom52WeekHigh: -11.4, sector: 'Consumer', displayName: { en: 'Amazon', ko: '아마존', zh: '亚马逊' } },
  { name: 'COST', marketCap: 385000, c: 865.45, dp: 1.25, high52: 895.0, percentageFrom52WeekHigh: -3.3, sector: 'Consumer', displayName: { en: 'Costco', ko: '코스트코', zh: '好市多' } },
  { name: 'HD', marketCap: 355000, c: 335.67, dp: 0.95, high52: 365.0, percentageFrom52WeekHigh: -8.0, sector: 'Consumer', displayName: { en: 'Home Depot', ko: '홈디포', zh: '家得宝' } },
  { name: 'MCD', marketCap: 195000, c: 265.28, dp: 1.15, high52: 285.0, percentageFrom52WeekHigh: -6.9, sector: 'Consumer', displayName: { en: "McDonald's", ko: '맥도날드', zh: '麦当劳' } },
  { name: 'WMT', marketCap: 565000, c: 75.45, dp: 0.65, high52: 82.0, percentageFrom52WeekHigh: -8.0, sector: 'Consumer', displayName: { en: 'Walmart', ko: '월마트', zh: '沃尔玛' } },
  { name: 'SBUX', marketCap: 115000, c: 92.45, dp: 2.35, high52: 118.25, percentageFrom52WeekHigh: -21.8, sector: 'Consumer', displayName: { en: 'Starbucks', ko: '스타벅스', zh: '星巴克' } },
  { name: 'NKE', marketCap: 155000, c: 100.28, dp: 1.38, high52: 130.45, percentageFrom52WeekHigh: -23.1, sector: 'Consumer', displayName: { en: 'Nike', ko: '나이키', zh: '耐克' } },

  // ETF - Macroeconomic Indicators (10)
  { name: 'SPY', marketCap: 520000, c: 485.25, dp: 0.35, high52: 495.0, percentageFrom52WeekHigh: -2.0, sector: 'ETF', displayName: { en: 'SPDR S&P 500 ETF', ko: 'S&P 500 ETF', zh: '标普500 ETF' } },
  { name: 'QQQ', marketCap: 245000, c: 395.67, dp: 0.42, high52: 408.0, percentageFrom52WeekHigh: -3.0, sector: 'ETF', displayName: { en: 'Invesco QQQ Trust', ko: '나스닥 100 ETF', zh: '纳斯达克100 ETF' } },
  { name: 'IWM', marketCap: 65000, c: 198.45, dp: 0.28, high52: 215.0, percentageFrom52WeekHigh: -7.7, sector: 'ETF', displayName: { en: 'iShares Russell 2000 ETF', ko: '러셀 2000 ETF', zh: '罗素2000 ETF' } },
  { name: 'TLT', marketCap: 18000, c: 92.35, dp: -0.15, high52: 105.0, percentageFrom52WeekHigh: -12.0, sector: 'ETF', displayName: { en: '20+ Year Treasury Bond ETF', ko: '20년+ 국채 ETF', zh: '20年+国债 ETF' } },
  { name: 'GLD', marketCap: 58000, c: 185.67, dp: 0.85, high52: 195.0, percentageFrom52WeekHigh: -4.8, sector: 'ETF', displayName: { en: 'SPDR Gold Shares', ko: '금 ETF', zh: '黄金 ETF' } },
  { name: 'USO', marketCap: 2800, c: 68.45, dp: 1.25, high52: 85.0, percentageFrom52WeekHigh: -19.5, sector: 'ETF', displayName: { en: 'United States Oil Fund', ko: '원유 ETF', zh: '原油 ETF' } },
  { name: 'VIX', marketCap: 1200, c: 18.25, dp: -2.15, high52: 35.0, percentageFrom52WeekHigh: -47.9, sector: 'ETF', displayName: { en: 'CBOE Volatility Index', ko: '변동성 지수', zh: '波动率指数' } },
  { name: 'DXY', marketCap: 850, c: 104.25, dp: 0.12, high52: 108.0, percentageFrom52WeekHigh: -3.5, sector: 'ETF', displayName: { en: 'US Dollar Index', ko: '달러 지수', zh: '美元指数' } },
  { name: 'EEM', marketCap: 28000, c: 42.85, dp: 0.68, high52: 48.0, percentageFrom52WeekHigh: -10.7, sector: 'ETF', displayName: { en: 'iShares MSCI Emerging Markets ETF', ko: '신흥국 ETF', zh: '新兴市场 ETF' } },
  { name: 'EFA', marketCap: 75000, c: 78.45, dp: 0.45, high52: 82.0, percentageFrom52WeekHigh: -4.3, sector: 'ETF', displayName: { en: 'iShares MSCI EAFE ETF', ko: '선진국 ETF', zh: '发达市场 ETF' } },
]

let memoryCache: StockData[] = []
let lastFetchTime = 0

// 현재 토큰 가져오기 (랜덤 선택으로 부하 분산)
function getCurrentToken(): string {
  // Rate limit을 피하기 위해 랜덤 토큰 선택
  const randomIndex = Math.floor(Math.random() * tokenArr.length)
  return tokenArr[randomIndex]
}

// 토큰 순환
function rotateToken(): void {
  currentTokenIndex = (currentTokenIndex + 1) % tokenArr.length
  console.log(`[TOKEN] Rotated to token index: ${currentTokenIndex}`)
}

// 순수 fetch 함수 (성능 측정 포함)
async function fetchStockQuote(symbol: string, token: string): Promise<{ data: any; timing: { fetchTime: number; parseTime: number; totalTime: number } }> {
  const startTime = performance.now()

  try {
    const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}`

    // 순수 fetch 시작
    const fetchStartTime = performance.now()
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Finnhub-Token': token,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(30000), // 30초 타임아웃
    })
    const fetchEndTime = performance.now()

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    // JSON 파싱 시작
    const parseStartTime = performance.now()
    const data = await response.json()
    const parseEndTime = performance.now()

    const totalTime = performance.now() - startTime
    const fetchTime = fetchEndTime - fetchStartTime
    const parseTime = parseEndTime - parseStartTime

    return {
      data,
      timing: {
        fetchTime: Math.round(fetchTime),
        parseTime: Math.round(parseTime),
        totalTime: Math.round(totalTime),
      },
    }
  } catch (error: any) {
    const totalTime = performance.now() - startTime
    throw new Error(`${symbol} fetch failed (${Math.round(totalTime)}ms): ${error.message}`)
  }
}

// 주식 데이터 가져오기 (캐시 우선, 백그라운드 업데이트)
async function fetchStockData(symbolNames: string[]): Promise<StockData[]> {
  const functionStartTime = performance.now()
  const now = Date.now()
  const { isMarketOpen } = useMarketOpen()

  console.log(`[S1] fetchStockData started - Market: ${isMarketOpen ? 'OPEN' : 'CLOSED'}`)

  // 마켓 상태 변경 감지 및 상태 리셋
  const resetCheckStart = performance.now()
  await checkAndResetForMarketStateChange(isMarketOpen)
  const resetCheckTime = performance.now() - resetCheckStart

  const shouldReset = await incrementCallCountAndCheck(!isMarketOpen)
  if (shouldReset) {
    console.log('[S1.1] Defensive reset triggered')
    memoryCache = []
    lastFetchTime = 0
  }

  // 1. 메모리 캐시 확인
  const cacheCheckStart = performance.now()
  if (memoryCache.length > 0 && now - lastFetchTime < getCacheTTL()) {
    const state = await readUpdateState()
    const canUseMemoryCache = isMarketOpen || state.hasCompletedInitialUpdate

    if (canUseMemoryCache) {
      const cacheCheckTime = performance.now() - cacheCheckStart
      console.log(`[S2] Memory cache hit (${Math.round(cacheCheckTime)}ms)`)
      return memoryCache
    }
  }

  // 2. 파일 캐시 확인
  const fileCacheStart = performance.now()
  const fileCache = await readFileCache()
  const fileCacheTime = performance.now() - fileCacheStart

  if (fileCache && fileCache.length === symbols.length) {
    const state = await readUpdateState()
    const canUseFileCache = isMarketOpen || state.hasCompletedInitialUpdate

    if (canUseFileCache) {
      console.log(`[S3-1] File cache hit (${Math.round(fileCacheTime)}ms)`)
      memoryCache = fileCache
      lastFetchTime = now
      return fileCache
    } else {
      console.log(`[S3-2] File cache loaded (${Math.round(fileCacheTime)}ms), continuing update`)
      memoryCache = fileCache
      lastFetchTime = now
    }
  }

  // 3. 초기화 및 백그라운드 업데이트
  const results = [...symbols]
  if (memoryCache.length === 0 || isMarketOpen) {
    memoryCache = results
    lastFetchTime = now
    await writeFileCache(results)
  }

  const state = await readUpdateState()
  const shouldPerformUpdate = (!state.hasCompletedInitialUpdate && !state.isBackgroundUpdateInProgress) || shouldReset

  if (isMarketOpen) {
    updateStockDataInBackground()
  } else if (shouldPerformUpdate) {
    performOneTimeUpdate()
  }

  return memoryCache
}

// 마켓 종료 시 1회성 업데이트
async function performOneTimeUpdate() {
  const startTime = performance.now()
  const canStart = await tryStartUpdate()
  if (!canStart) {
    return
  }

  console.log('[U1] One-time update started')
  memoryCache = [...symbols]

  const fileCache = await readFileCache()
  // 하드코딩된 데이터와 실제 API 업데이트된 데이터 구분
  // timestamp가 없거나 매우 오래된 데이터는 업데이트 필요로 판단
  const recentThreshold = Date.now() - 24 * 60 * 60 * 1000 // 24시간 전
  const cachedSymbols = new Set(fileCache?.filter((item: StockData) => item.timestamp && item.timestamp > recentThreshold).map((item: StockData) => item.name) || [])
  const symbolsToUpdate = symbols.filter((symbol) => !cachedSymbols.has(symbol.name))

  console.log(`[U2] Update queue: ${symbolsToUpdate.length}/${symbols.length} symbols`)

  let successCount = 0
  const totalSymbols = symbolsToUpdate.length

  if (totalSymbols === 0) {
    console.log('[U3] All symbols cached, completed')
    await markUpdateCompleted()
    return
  }

  try {
    // 병렬 처리를 위한 배치 분할 (Edge Function에서는 더 작은 배치)
    const batchSize = 5
    const batches = []
    for (let i = 0; i < symbolsToUpdate.length; i += batchSize) {
      batches.push(symbolsToUpdate.slice(i, i + batchSize))
    }

    console.log(`[U2.1] Processing ${batches.length} batches of up to ${batchSize} symbols`)

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex]
      const batchStartTime = performance.now()

      // 배치 내 병렬 처리
      const batchPromises = batch.map(async (symbol) => {
        try {
          const token = getCurrentToken()
          const result = await fetchStockQuote(symbol.name, token)

          const percentage = ((result.data.c - symbol.high52) / symbol.high52) * 100
          const updatedStock = {
            ...symbol,
            c: result.data.c,
            dp: result.data.dp,
            percentageFrom52WeekHigh: parseFloat(percentage.toFixed(2)),
            timestamp: Date.now(),
          }

          const index = memoryCache.findIndex((s) => s.name === symbol.name)
          if (index !== -1) {
            memoryCache[index] = updatedStock
          }

          return {
            success: true,
            symbol: symbol.name,
            timing: result.timing,
            data: result.data,
          }
        } catch (error: any) {
          console.error(`[U4] ${error.message}`)

          if (error.message.includes('429')) {
            rotateToken()
          }
          return { success: false, symbol: symbol.name, error: error.message }
        }
      })

      // 배치 결과 대기
      const batchResults = await Promise.allSettled(batchPromises)
      const batchSuccesses = batchResults.filter((result) => result.status === 'fulfilled' && result.value.success)

      // 성능 통계 계산
      const successfulResults = batchSuccesses
        .filter((r) => r.status === 'fulfilled')
        .map((r) => (r as PromiseFulfilledResult<any>).value)
        .filter((v) => v.timing)
      const avgFetchTime = successfulResults.length > 0 ? Math.round(successfulResults.reduce((sum, r) => sum + r.timing.fetchTime, 0) / successfulResults.length) : 0
      const maxFetchTime = successfulResults.length > 0 ? Math.max(...successfulResults.map((r) => r.timing.fetchTime)) : 0

      successCount += batchSuccesses.length
      const batchTime = Math.round(performance.now() - batchStartTime)
      const currentProgress = ((successCount / totalSymbols) * 100).toFixed(1)

      console.log(`[U3] Batch ${batchIndex + 1}/${batches.length}: ${batchSuccesses.length}/${batch.length} success, Progress: ${successCount}/${totalSymbols} (${currentProgress}%) - Batch: ${batchTime}ms, AvgFetch: ${avgFetchTime}ms, MaxFetch: ${maxFetchTime}ms`)

      // 배치 간 짧은 대기 (Rate limiting 방지)
      if (batchIndex < batches.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }

      // 중간 캐시 저장 (데이터 손실 방지)
      if (batchIndex % 2 === 1) {
        await writeFileCache(memoryCache)
      }
    }

    await writeFileCache(memoryCache)
    lastFetchTime = Date.now()

    const successRateNumber = (successCount / totalSymbols) * 100
    const totalTime = Math.round(performance.now() - startTime)

    if (successRateNumber >= 50) {
      await markUpdateCompleted()
      console.log(`[U5] Update completed: ${successCount}/${totalSymbols} (${successRateNumber.toFixed(1)}%) in ${totalTime}ms`)
    } else {
      console.warn(`[U6] Low success rate: ${successRateNumber.toFixed(1)}%`)
      await writeUpdateState({ isBackgroundUpdateInProgress: false })
    }
  } catch (error: any) {
    const totalTime = Math.round(performance.now() - startTime)
    console.error(`[U7] Critical failure after ${totalTime}ms:`, error?.message)
    await writeUpdateState({ isBackgroundUpdateInProgress: false })
  }
}

// 백그라운드에서 주식 데이터 업데이트 (마켓 오픈 시에만)
async function updateStockDataInBackground() {
  const startTime = performance.now()
  const canStart = await tryStartUpdate()
  if (!canStart) {
    return
  }

  console.log('[B1] Background update started')

  const fileCache = await readFileCache()
  // 하드코딩된 데이터와 실제 API 업데이트된 데이터 구분
  const recentThreshold = Date.now() - 24 * 60 * 60 * 1000 // 24시간 전
  const cachedSymbols = new Set(fileCache?.filter((item: StockData) => item.timestamp && item.timestamp > recentThreshold).map((item: StockData) => item.name) || [])
  const symbolsToUpdate = symbols.filter((symbol) => !cachedSymbols.has(symbol.name))

  console.log(`[B2] Update queue: ${symbolsToUpdate.length}/${symbols.length} symbols`)

  if (symbolsToUpdate.length === 0) {
    console.log('[B3] All symbols cached, completed')
    await writeUpdateState({ isBackgroundUpdateInProgress: false })
    return
  }

  // 섹터별 병렬 처리
  const sectors = [...new Set(symbolsToUpdate.map((s) => s.sector))]
  let successCount = 0
  const totalSymbols = symbolsToUpdate.length

  try {
    for (const sector of sectors) {
      const sectorSymbols = symbolsToUpdate.filter((s) => s.sector === sector)
      const sectorStartTime = performance.now()
      console.log(`[B4] Processing ${sector}: ${sectorSymbols.length} stocks`)

      try {
        // 섹터 내 병렬 처리 (Edge Function에서는 더 작은 배치)
        const batchSize = 4
        const batches = []
        for (let i = 0; i < sectorSymbols.length; i += batchSize) {
          batches.push(sectorSymbols.slice(i, i + batchSize))
        }

        for (const batch of batches) {
          const batchPromises = batch.map(async (symbol) => {
            try {
              const token = getCurrentToken()
              const result = await fetchStockQuote(symbol.name, token)

              const percentage = ((result.data.c - symbol.high52) / symbol.high52) * 100
              const updatedStock = {
                ...symbol,
                c: result.data.c,
                dp: result.data.dp,
                percentageFrom52WeekHigh: parseFloat(percentage.toFixed(2)),
                timestamp: Date.now(),
              }

              const index = memoryCache.findIndex((s) => s.name === symbol.name)
              if (index !== -1) {
                memoryCache[index] = updatedStock
              }

              return { success: true, symbol: symbol.name, timing: result.timing }
            } catch (error: any) {
              console.error(`[B5] ${error.message}`)

              if (error.message.includes('429')) {
                rotateToken()
              }
              return { success: false, symbol: symbol.name }
            }
          })

          const batchResults = await Promise.allSettled(batchPromises)
          const batchSuccesses = batchResults.filter((result) => result.status === 'fulfilled' && result.value.success).length

          successCount += batchSuccesses

          // 배치 간 짧은 대기
          await new Promise((resolve) => setTimeout(resolve, 100))
        }

        await writeFileCache(memoryCache)
        const sectorTime = Math.round(performance.now() - sectorStartTime)
        console.log(`[B6] Completed ${sector} sector: ${sectorSymbols.length} stocks in ${sectorTime}ms`)
      } catch (error: any) {
        console.error(`[B7] Sector ${sector} failed:`, error?.message)
      }
    }

    const successRate = ((successCount / totalSymbols) * 100).toFixed(1)
    const totalTime = Math.round(performance.now() - startTime)
    console.log(`[B8] Background update completed: ${successCount}/${totalSymbols} (${successRate}%) in ${totalTime}ms`)
  } catch (error: any) {
    const totalTime = Math.round(performance.now() - startTime)
    console.error(`[B9] Background update failed after ${totalTime}ms:`, error?.message)
  } finally {
    await writeUpdateState({ isBackgroundUpdateInProgress: false })
  }
}

export default defineEventHandler(async (event) => {
  const requestStartTime = performance.now()

  try {
    // 전체 데이터 가져오기 (배치 로직 제거)
    const dataFetchStart = performance.now()
    const allData = await fetchStockData(symbols.map((s) => s.name))
    const dataFetchTime = performance.now() - dataFetchStart

    // 파일 기반 상태 읽기
    const stateReadStart = performance.now()
    const state = await readUpdateState()
    const stateReadTime = performance.now() - stateReadStart

    const responseTime = Math.round(performance.now() - requestStartTime)
    console.log(`[S4] API response ready in ${responseTime}ms - dataFetch: ${Math.round(dataFetchTime)}ms, stateRead: ${Math.round(stateReadTime)}ms`)

    return {
      data: allData,
      totalSymbols: allData.length,
      updateStatus: {
        isMarketOpen: useMarketOpen().isMarketOpen,
        hasCompletedInitialUpdate: state.hasCompletedInitialUpdate,
        isBackgroundUpdateInProgress: state.isBackgroundUpdateInProgress,
        lastUpdateTime: state.lastUpdateTimestamp,
      },
      _performance: {
        responseTime,
        dataFetchTime: Math.round(dataFetchTime),
        stateReadTime: Math.round(stateReadTime),
        serverTime: new Date().toISOString(),
      },
    }
  } catch (error) {
    const errorTime = Math.round(performance.now() - requestStartTime)
    console.error(`[S4] API failed after ${errorTime}ms:`, error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch stock data',
    })
  }
})
