import { defineEventHandler } from 'h3'
import { $fetch } from 'ohmyfetch'

// 전역 변수로 캐싱 데이터를 저장
let cachedData: any = null
let cacheTimestamp: number | null = null
const CACHE_DURATION = 1000 * 60 // 1분

export default defineEventHandler(async () => {
    const now = Date.now()

    // 캐시가 유효한지 확인
    if (cachedData && cacheTimestamp && now - cacheTimestamp < CACHE_DURATION) {
        return cachedData
    }

    // 테스트용 샘플 데이터 (실제 API 호출 전에 사용)
    const sampleData = {
        gdp: {
            date: '2023-01-01',
            value: '21.5 Trillion USD'
        },
        unemployment: {
            date: '2023-01-01',
            value: '3.8'
        },
        inflation: {
            date: '2023-01-01',
            value: '2.6'
        }
    }


    // TODO. 테스트
    cachedData = sampleData
    cacheTimestamp = now

    return cachedData

    // 실제 API 호출
    const apiKey = process.env.ALPHA_VANTAGE_KEY

    try {
        const gdpUrl = `https://www.alphavantage.co/query?function=REAL_GDP&apikey=${apiKey}`
        const unemploymentUrl = `https://www.alphavantage.co/query?function=UNEMPLOYMENT&apikey=${apiKey}`
        const inflationUrl = `https://www.alphavantage.co/query?function=CPI&apikey=${apiKey}`

        const gdpResponse = await $fetch(gdpUrl)
        const unemploymentResponse = await $fetch(unemploymentUrl)
        const inflationResponse = await $fetch(inflationUrl)

        // 필요한 데이터만 추출
        const gdpData = gdpResponse.data[0] || {}
        const unemploymentData = unemploymentResponse.data[0] || {}
        const inflationData = inflationResponse.data[0] || {}

        cachedData = {
            gdp: {
                date: gdpData.date || sampleData.gdp.date,
                value: gdpData.value || sampleData.gdp.value,
            },
            unemployment: {
                date: unemploymentData.date || sampleData.unemployment.date,
                value: unemploymentData.value || sampleData.unemployment.value,
            },
            inflation: {
                date: inflationData.date || sampleData.inflation.date,
                value: inflationData.value || sampleData.inflation.value,
            }
        }

    } catch (error) {
        // API 호출이 실패하면 샘플 데이터를 사용
        cachedData = sampleData
    }

    // 캐시 타임스탬프 업데이트
    cacheTimestamp = now

    return cachedData
})
