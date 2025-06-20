import { defineEventHandler, getQuery } from 'h3'
import { $fetch } from 'ohmyfetch'
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
  { name: 'V', marketCap: 590000, c: 285.67, dp: 0.72, high52: 295.25, percentageFrom52WeekHigh: -3.2, sector: 'Financial', displayName: { en: 'Visa', ko: '비자', zh: '维萨' } },
  { name: 'MA', marketCap: 440000, c: 455.28, dp: 0.56, high52: 495.0, percentageFrom52WeekHigh: -8.0, sector: 'Financial', displayName: { en: 'Mastercard', ko: '마스터카드', zh: '万事达' } },
  { name: 'GS', marketCap: 135000, c: 395.45, dp: 2.68, high52: 395.58, percentageFrom52WeekHigh: -0.03, sector: 'Financial', displayName: { en: 'Goldman Sachs', ko: '골드만삭스', zh: '高盛' } },
  { name: 'MS', marketCap: 155000, c: 88.95, dp: 3.38, high52: 96.25, percentageFrom52WeekHigh: -7.6, sector: 'Financial', displayName: { en: 'Morgan Stanley', ko: '모건스탠리', zh: '摩根士丹利' } },
  { name: 'BLK', marketCap: 125000, c: 805.28, dp: 2.45, high52: 845.0, percentageFrom52WeekHigh: -4.7, sector: 'Financial', displayName: { en: 'BlackRock', ko: '블랙록', zh: '贝莱德' } },

  // Consumer (7)
  { name: 'AMZN', marketCap: 1900000, c: 182.45, dp: 0, high52: 192.25, percentageFrom52WeekHigh: -5.1, sector: 'Consumer', displayName: { en: 'Amazon', ko: '아마존', zh: '亚马逊' } },
  { name: 'WMT', marketCap: 490000, c: 60.28, dp: 1.42, high52: 62.15, percentageFrom52WeekHigh: -3.0, sector: 'Consumer', displayName: { en: 'Walmart', ko: '월마트', zh: '沃尔玛' } },
  { name: 'PG', marketCap: 390000, c: 158.95, dp: 2.4, high52: 160.25, percentageFrom52WeekHigh: -0.8, sector: 'Consumer', displayName: { en: 'Procter & Gamble', ko: 'P&G', zh: '宝洁' } },
  { name: 'KO', marketCap: 270000, c: 61.28, dp: 3.1, high52: 65.45, percentageFrom52WeekHigh: -6.4, sector: 'Consumer', displayName: { en: 'Coca-Cola', ko: '코카콜라', zh: '可口可乐' } },
  { name: 'MCD', marketCap: 215000, c: 285.67, dp: 2.25, high52: 300.25, percentageFrom52WeekHigh: -4.9, sector: 'Consumer', displayName: { en: "McDonald's", ko: '맥도날드', zh: '麦当劳' } },
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

// 현재 토큰 가져오기
function getCurrentToken(): string {
  return tokenArr[currentTokenIndex]
}

// 토큰 순환
function rotateToken(): void {
  currentTokenIndex = (currentTokenIndex + 1) % tokenArr.length
}

// 배치 단위로 Finnhub API 호출 (안정성 개선)
async function fetchStockBatch(symbolNames: string[], batchSize: number): Promise<StockData[]> {
  const now = Date.now()
  const { isMarketOpen } = useMarketOpen()

  // 마켓 상태 변경 감지 및 상태 리셋
  await checkAndResetForMarketStateChange(isMarketOpen)

  // 방어 로직: 마켓 종료 시 호출 횟수 추적 및 과도한 호출 방지
  const shouldReset = await incrementCallCountAndCheck(!isMarketOpen)
  if (shouldReset) {
    console.log('[INFO] Defensive reset triggered - clearing memory cache')
    memoryCache = [] // 메모리 캐시도 클리어
    lastFetchTime = 0
  }

  // 1. 메모리 캐시 확인 (가장 빠름) - 백그라운드 업데이트 상태도 고려
  if (memoryCache.length > 0 && now - lastFetchTime < getCacheTTL()) {
    const state = await readUpdateState()
    // 마켓이 열려있거나, 마켓이 닫혀있지만 초기 업데이트가 완료된 경우에만 메모리 캐시 사용
    const canUseMemoryCache = isMarketOpen || state.hasCompletedInitialUpdate

    if (canUseMemoryCache) {
      console.log('[INFO] Using memory cache for stocks')
      return memoryCache
    } else {
      console.log('[INFO] Memory cache available but background update not completed, proceeding with initialization')
    }
  }

  // 2. 파일 캐시 확인 (두 번째로 빠름)
  const fileCache = await readFileCache()
  if (fileCache && fileCache.length === symbols.length) {
    console.log('[INFO] Using file cache for stocks')
    memoryCache = fileCache
    lastFetchTime = now
    return fileCache
  }

  // 3. 캐시가 없거나 불완전한 경우 처리
  console.log('[INFO] Initializing stock data')

  // 공통: 하드코딩된 데이터로 초기화
  const results = [...symbols]
  if (memoryCache.length === 0 || isMarketOpen) {
    memoryCache = results
    lastFetchTime = now
    await writeFileCache(results)
  }

  if (isMarketOpen) {
    // 마켓이 열려있을 때: 백그라운드에서 점진적 업데이트
    console.log('[INFO] Market is open - using hardcoded data and starting background update')
    updateStockDataInBackground()
    return results
  } else {
    // 마켓이 닫혀있을 때: 백그라운드에서 1회성 업데이트
    console.log('[INFO] Market is closed - using hardcoded data and starting one-time background update')

    // 파일 기반 상태 확인 후 백그라운드 업데이트 실행
    const state = await readUpdateState()
    const shouldPerformUpdate = (!state.hasCompletedInitialUpdate && !state.isBackgroundUpdateInProgress) || shouldReset

    if (shouldPerformUpdate) {
      if (shouldReset) {
        console.log('[INFO] Defensive reset completed - forcing one-time update restart')
      }
      performOneTimeUpdate() // await 제거 - 백그라운드 실행
    }

    // 캐시된 데이터 즉시 반환
    return memoryCache
  }
}

// 마켓 종료 시 1회성 업데이트
async function performOneTimeUpdate() {
  // 동시성 제어 - 이미 업데이트 중이면 종료
  const canStart = await tryStartUpdate()
  if (!canStart) {
    return
  }

  console.log('[INFO] Starting one-time stock data update (market closed)')

  // 하드코딩된 데이터로 초기화
  memoryCache = [...symbols]

  // 파일 캐시에서 이미 업데이트된 심볼들 확인
  const fileCache = await readFileCache()
  const cachedSymbols = new Set(fileCache?.map((item: StockData) => item.name) || [])

  // 아직 업데이트되지 않은 심볼들만 필터링
  const symbolsToUpdate = symbols.filter((symbol) => !cachedSymbols.has(symbol.name))

  console.log(`[INFO] Found ${cachedSymbols.size} cached symbols, need to update ${symbolsToUpdate.length} symbols`)

  let successCount = 0
  let failureCount = 0
  const totalSymbols = symbolsToUpdate.length

  // 업데이트할 심볼이 없으면 완료 처리
  if (totalSymbols === 0) {
    console.log('[INFO] All symbols already cached, marking as completed')
    await markUpdateCompleted()
    return
  }

  try {
    // 업데이트가 필요한 주식들만 API 호출
    for (const symbol of symbolsToUpdate) {
      try {
        const url = `https://finnhub.io/api/v1/quote?symbol=${symbol.name}`
        const response = await $fetch(url, {
          headers: {
            'X-Finnhub-Token': getCurrentToken(),
            'Content-Type': 'application/json',
          },
        })

        const percentage = ((response.c - symbol.high52) / symbol.high52) * 100

        const updatedStock = {
          ...symbol,
          c: response.c,
          dp: response.dp,
          percentageFrom52WeekHigh: parseFloat(percentage.toFixed(2)),
        }

        // 메모리 캐시에서 해당 주식 업데이트
        const index = memoryCache.findIndex((s) => s.name === symbol.name)
        if (index !== -1) {
          memoryCache[index] = updatedStock
        }

        successCount++
        // 성공 통계 로깅
        const successRate = ((successCount / totalSymbols) * 100).toFixed(1)
        console.log(`[INFO] Update statistics: ${successCount}/${totalSymbols} successful (${successRate}%)`)

        // 대기 (rate limit 고려 - 1회성이므로 좀 더 빠르게)
        await new Promise((resolve) => setTimeout(resolve, 100))
      } catch (error: any) {
        failureCount++
        console.error(`[ERROR] Failed to update ${symbol.name}:`, error?.message)

        if (error?.response?.status === 429) {
          rotateToken()
          await new Promise((resolve) => setTimeout(resolve, 3000)) // 3초 대기
        }
      }
    }

    // 파일 캐시 업데이트 (부분적 성공이라도 저장)
    await writeFileCache(memoryCache)
    lastFetchTime = Date.now()

    // 성공률이 50% 이상이면 완료로 처리 (너무 많은 실패가 아닌 경우)
    const successRateNumber = (successCount / totalSymbols) * 100
    if (successRateNumber >= 50) {
      await markUpdateCompleted()
      console.log(`[INFO] One-time stock data update completed successfully (${successRateNumber}% success rate)`)
    } else {
      console.warn(`[WARNING] One-time update had low success rate (${successRateNumber}%), not marking as completed`)
      // 실패 시에는 진행 중 상태만 해제
      await writeUpdateState({ isBackgroundUpdateInProgress: false })
    }
  } catch (error: any) {
    console.error(`[ERROR] Critical failure in one-time update:`, error?.message)
    // 치명적 실패 시에도 진행 중 상태 해제
    await writeUpdateState({ isBackgroundUpdateInProgress: false })
  }
}

// 백그라운드에서 주식 데이터 업데이트 (마켓 오픈 시에만)
async function updateStockDataInBackground() {
  // 동시성 제어 - 이미 업데이트 중이면 종료
  const canStart = await tryStartUpdate()
  if (!canStart) {
    return
  }

  console.log('[INFO] Starting background stock data update')

  // 파일 캐시에서 이미 업데이트된 심볼들 확인
  const fileCache = await readFileCache()
  const cachedSymbols = new Set(fileCache?.map((item: StockData) => item.name) || [])

  // 아직 업데이트되지 않은 심볼들만 필터링
  const symbolsToUpdate = symbols.filter((symbol) => !cachedSymbols.has(symbol.name))

  console.log(`[INFO] Found ${cachedSymbols.size} cached symbols, need to update ${symbolsToUpdate.length} symbols`)

  // 업데이트할 심볼이 없으면 완료 처리
  if (symbolsToUpdate.length === 0) {
    console.log('[INFO] All symbols already cached, background update completed')
    await writeUpdateState({ isBackgroundUpdateInProgress: false })
    return
  }

  const sectors = [...new Set(symbolsToUpdate.map((s) => s.sector))]
  let successCount = 0
  let failureCount = 0
  const totalSymbols = symbolsToUpdate.length

  try {
    for (const sector of sectors) {
      const sectorSymbols = symbolsToUpdate.filter((s) => s.sector === sector)
      console.log(`[INFO] Updating ${sector} sector data (${sectorSymbols.length} stocks)`)

      try {
        // 섹터별로 순차 처리 (rate limit 고려)
        for (const symbol of sectorSymbols) {
          try {
            const url = `https://finnhub.io/api/v1/quote?symbol=${symbol.name}`
            const response = await $fetch(url, {
              headers: {
                'X-Finnhub-Token': getCurrentToken(),
                'Content-Type': 'application/json',
              },
            })

            const percentage = ((response.c - symbol.high52) / symbol.high52) * 100

            const updatedStock = {
              ...symbol,
              c: response.c,
              dp: response.dp,
              percentageFrom52WeekHigh: parseFloat(percentage.toFixed(2)),
            }

            // 메모리 캐시에서 해당 주식 업데이트
            const index = memoryCache.findIndex((s) => s.name === symbol.name)
            if (index !== -1) {
              memoryCache[index] = updatedStock
            }

            successCount++

            // 대기 (rate limit 고려)
            await new Promise((resolve) => setTimeout(resolve, 100))
          } catch (error: any) {
            failureCount++
            console.error(`[ERROR] Failed to update ${symbol.name}:`, error?.message)

            if (error?.response?.status === 429) {
              rotateToken()
              await new Promise((resolve) => setTimeout(resolve, 5000)) // 5초 대기
            }
          }
        }

        // 섹터 완료 후 파일 캐시 업데이트
        await writeFileCache(memoryCache)
        console.log(`[INFO] Updated ${sector} sector data`)
      } catch (error: any) {
        console.error(`[ERROR] Failed to update ${sector} sector:`, error?.message)
      }
    }

    // 성공/실패 통계 로깅
    const successRate = ((successCount / totalSymbols) * 100).toFixed(1)
    console.log(`[INFO] Background stock data update completed: ${successCount}/${totalSymbols} successful (${successRate}%)`)
  } catch (error: any) {
    console.error(`[ERROR] Background update failed:`, error?.message)
  } finally {
    // 진행 중 상태 해제
    await writeUpdateState({ isBackgroundUpdateInProgress: false })
  }
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const batchIndex = parseInt(query.batchIndex as string) || 0
  const batchSize = parseInt(query.batchSize as string) || 12

  try {
    // 전체 데이터 가져오기
    const allData = await fetchStockBatch(
      symbols.map((s) => s.name),
      batchSize
    )

    // 현재 배치에 해당하는 데이터만 선택
    const startIndex = batchIndex * batchSize
    const endIndex = Math.min(startIndex + batchSize, allData.length)
    const batchData = allData.slice(startIndex, endIndex)

    // 파일 기반 상태 읽기
    const state = await readUpdateState()

    return {
      data: batchData,
      hasNextBatch: endIndex < allData.length,
      totalSymbols: allData.length,
      currentBatch: batchIndex,
      totalBatches: Math.ceil(allData.length / batchSize),
      updateStatus: {
        isMarketOpen: useMarketOpen().isMarketOpen,
        hasCompletedInitialUpdate: state.hasCompletedInitialUpdate,
        isBackgroundUpdateInProgress: state.isBackgroundUpdateInProgress,
      },
    }
  } catch (error) {
    console.error('[ERROR] Failed to fetch stock batch:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch stock data',
    })
  }
})
