import { defineEventHandler, getQuery, createError } from 'h3'

const tokenArr = [process.env.FINN_1_KEY, process.env.FINN_2_KEY, process.env.FINN_3_KEY, process.env.FINN_4_KEY].filter((token): token is string => Boolean(token))

// 네트워크 타이밍 세부 측정 함수
function getDetailedNetworkTiming(url: string, startTime: number, endTime: number) {
  try {
    // Performance API를 통한 네트워크 타이밍 정보 수집
    const entries = performance.getEntriesByName(url, 'resource')
    if (entries.length > 0) {
      const entry = entries[entries.length - 1] as PerformanceResourceTiming

      return {
        // DNS 탐색 시간
        dnsLookup: entry.domainLookupEnd - entry.domainLookupStart,
        // TCP 연결 설정 시간
        tcpConnect: entry.connectEnd - entry.connectStart,
        // TLS/SSL 핸드셰이크 시간 (HTTPS의 경우)
        tlsHandshake: entry.secureConnectionStart > 0 ? entry.connectEnd - entry.secureConnectionStart : 0,
        // 요청 전송 시간
        requestSent: entry.responseStart - entry.requestStart,
        // 응답 대기 시간 (TTFB - Time To First Byte)
        waitingTime: entry.responseStart - entry.requestStart,
        // 응답 다운로드 시간
        downloadTime: entry.responseEnd - entry.responseStart,
        // 전체 네트워크 시간
        totalNetworkTime: entry.responseEnd - entry.fetchStart,
        // 리다이렉트 시간
        redirectTime: entry.redirectEnd - entry.redirectStart,
        // 상세 타임스탬프
        timestamps: {
          fetchStart: Math.round(entry.fetchStart),
          domainLookupStart: Math.round(entry.domainLookupStart),
          domainLookupEnd: Math.round(entry.domainLookupEnd),
          connectStart: Math.round(entry.connectStart),
          secureConnectionStart: Math.round(entry.secureConnectionStart),
          connectEnd: Math.round(entry.connectEnd),
          requestStart: Math.round(entry.requestStart),
          responseStart: Math.round(entry.responseStart),
          responseEnd: Math.round(entry.responseEnd),
        },
      }
    }
  } catch (error) {
    console.warn('[TIMING] Performance API not available or failed:', error)
  }

  // Performance API를 사용할 수 없는 경우 기본 측정값 반환
  return {
    dnsLookup: 0,
    tcpConnect: 0,
    tlsHandshake: 0,
    requestSent: 0,
    waitingTime: 0,
    downloadTime: 0,
    totalNetworkTime: Math.round(endTime - startTime),
    redirectTime: 0,
    timestamps: null,
    note: 'Performance API not available - using basic timing',
  }
}

// 순수 fetch 함수 (세부 성능 측정 포함)
async function testFinnhubAPI(symbol: string, token: string) {
  const overallStartTime = performance.now()

  try {
    const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}`

    // Performance 엔트리 초기화 (이전 엔트리 제거)
    try {
      performance.clearResourceTimings()
    } catch (e) {
      // Edge Function에서는 지원하지 않을 수 있음
    }

    // 연결 준비 시간 측정
    const preConnectTime = performance.now()

    // 순수 fetch 시작
    const fetchStartTime = performance.now()
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Finnhub-Token': token,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'BBstoqq-Test/1.0',
        // 연결 재사용 방지를 위한 헤더 (정확한 측정)
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
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

    // 세부 네트워크 타이밍 수집
    const detailedTiming = getDetailedNetworkTiming(url, fetchStartTime, fetchEndTime)

    const totalTime = performance.now() - overallStartTime
    const fetchTime = fetchEndTime - fetchStartTime
    const parseTime = parseEndTime - parseStartTime
    const setupTime = fetchStartTime - preConnectTime

    return {
      success: true,
      symbol,
      data,
      timing: {
        // 기본 타이밍
        setupTime: Math.round(setupTime),
        fetchTime: Math.round(fetchTime),
        parseTime: Math.round(parseTime),
        totalTime: Math.round(totalTime),

        // 세부 네트워크 타이밍
        network: {
          dnsLookup: Math.round(detailedTiming.dnsLookup),
          tcpConnect: Math.round(detailedTiming.tcpConnect),
          tlsHandshake: Math.round(detailedTiming.tlsHandshake),
          requestSent: Math.round(detailedTiming.requestSent),
          waitingTime: Math.round(detailedTiming.waitingTime), // TTFB
          downloadTime: Math.round(detailedTiming.downloadTime),
          redirectTime: Math.round(detailedTiming.redirectTime),
          totalNetworkTime: Math.round(detailedTiming.totalNetworkTime),
        },

        // 상세 분석
        breakdown: {
          'DNS 탐색': Math.round(detailedTiming.dnsLookup),
          'TCP 연결': Math.round(detailedTiming.tcpConnect),
          'TLS 핸드셰이크': Math.round(detailedTiming.tlsHandshake),
          '요청 전송': Math.round(detailedTiming.requestSent),
          '서버 응답 대기': Math.round(detailedTiming.waitingTime),
          '데이터 다운로드': Math.round(detailedTiming.downloadTime),
          'JSON 파싱': Math.round(parseTime),
        },

        // 디버깅용 타임스탬프
        timestamps: detailedTiming.timestamps,
      },
      response: {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        size: response.headers.get('content-length') || 'unknown',
      },
      request: {
        url,
        token: token.substring(0, 8) + '...' + token.substring(token.length - 4), // 토큰 마스킹
        method: 'GET',
      },
    }
  } catch (error: any) {
    const totalTime = performance.now() - overallStartTime
    return {
      success: false,
      symbol,
      error: error.message,
      timing: {
        totalTime: Math.round(totalTime),
        fetchTime: 0,
        parseTime: 0,
        network: null,
        breakdown: null,
        note: 'Request failed before completion',
      },
      request: {
        url: `https://finnhub.io/api/v1/quote?symbol=${symbol}`,
        token: token.substring(0, 8) + '...' + token.substring(token.length - 4),
        method: 'GET',
      },
    }
  }
}

// 여러 토큰으로 동시 테스트
async function testMultipleTokens(symbol: string) {
  const startTime = performance.now()

  const promises = tokenArr.map(async (token, index) => {
    const result = await testFinnhubAPI(symbol, token)
    return {
      tokenIndex: index,
      ...result,
    }
  })

  const results = await Promise.allSettled(promises)
  const totalTestTime = Math.round(performance.now() - startTime)

  return {
    symbol,
    totalTokens: tokenArr.length,
    totalTestTime,
    results: results.map((result) => (result.status === 'fulfilled' ? result.value : { error: 'Promise rejected', reason: result.reason })),
  }
}

// 연속 호출 테스트 (Rate Limiting 확인)
async function testSequentialCalls(symbol: string, count: number = 5) {
  const startTime = performance.now()
  const results = []

  for (let i = 0; i < count; i++) {
    const token = tokenArr[i % tokenArr.length]
    const callStartTime = performance.now()

    const result = await testFinnhubAPI(symbol, token)
    const callTime = Math.round(performance.now() - callStartTime)

    results.push({
      callIndex: i + 1,
      callTime,
      ...result,
    })

    // 각 호출 간 100ms 대기
    if (i < count - 1) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }

  const totalTime = Math.round(performance.now() - startTime)

  return {
    symbol,
    totalCalls: count,
    totalTime,
    averageTime: Math.round(results.reduce((sum, r) => sum + (r.timing?.totalTime || 0), 0) / count),
    results,
  }
}

export default defineEventHandler(async (event) => {
  const requestStartTime = performance.now()

  try {
    const query = getQuery(event)
    const adminKey = query.key as string
    const symbol = (query.symbol as string) || 'AAPL'
    const testType = (query.type as string) || 'single'
    const count = parseInt(query.count as string) || 5

    // 어드민 키 검증
    if (!adminKey || adminKey !== process.env.ADMIN_SECRET_KEY) {
      console.log(`[ADMIN-TEST] Unauthorized access attempt from ${event.node.req.headers['x-forwarded-for'] || 'unknown'}`)
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized',
      })
    }

    console.log(`[ADMIN-TEST] Testing Finnhub API - Symbol: ${symbol}, Type: ${testType}`)

    let result

    switch (testType) {
      case 'single':
        // 단일 토큰으로 단일 호출
        const token = tokenArr[Math.floor(Math.random() * tokenArr.length)]
        result = await testFinnhubAPI(symbol, token)
        break

      case 'multi':
        // 모든 토큰으로 동시 호출
        result = await testMultipleTokens(symbol)
        break

      case 'sequential':
        // 연속 호출 테스트
        result = await testSequentialCalls(symbol, count)
        break

      default:
        throw createError({
          statusCode: 400,
          statusMessage: 'Invalid test type. Use: single, multi, or sequential',
        })
    }

    const totalRequestTime = Math.round(performance.now() - requestStartTime)

    return {
      test: {
        type: testType,
        symbol,
        timestamp: new Date().toISOString(),
        totalRequestTime,
        environment: {
          region: process.env.VERCEL_REGION || 'unknown',
          runtime: 'edge',
          nodeVersion: process.version,
        },
      },
      result,
    }
  } catch (error: any) {
    const errorTime = Math.round(performance.now() - requestStartTime)
    console.error(`[ADMIN-TEST] Test failed after ${errorTime}ms:`, error.message)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: `Test failed: ${error.message}`,
    })
  }
})
