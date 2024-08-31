import { defineEventHandler } from 'h3'
import { $fetch } from 'ohmyfetch'
import dayjs from 'dayjs'
import { useMarketOpen } from '~/composables/useMarketOpen'

// 전역 변수로 캐싱 데이터를 저장
let cachedData: any[] | null = null
let cacheTimestamp: number | null = null
const CACHE_DURATION = 1000 * 70 // 1분 10초
const { isMarketOpen } = useMarketOpen()

export default defineEventHandler(async () => {
    const now = Date.now()

    if (cachedData && !isMarketOpen) {
        return cachedData
    }

    // 캐시가 유효한지 확인
    if (cachedData && cacheTimestamp && now - cacheTimestamp < CACHE_DURATION) {
        return cachedData
    }

    // 캐시가 유효하지 않다면 데이터를 다시 가져옴
    const indicators = [
        { code: 'GDP', name: 'Gross Domestic Product (GDP)' }, // 미국 GDP
        { code: 'UNRATE', name: 'Unemployment Rate' }, // 실업률
        { code: 'CPIAUCSL', name: 'CPI: All Items in U.S. City Average' }, // 소비자물가지수(CPI)
        { code: 'DFF', name: 'Effective Federal Funds Rate' }, // 연방 기금 금리
        { code: 'INDPRO', name: 'Industrial Production Index' }, // 산업 생산지수
        { code: 'PAYEMS', name: 'Nonfarm Payrolls' }, // 비농업 부문 고용지수
        { code: 'DGS10', name: '10-Year Treasury Constant Maturity Rate' }, // 10년 만기 국채 수익률
        { code: 'M2SL', name: 'M2 Money Stock' }, // M2 통화량
        { code: 'RSAFS', name: 'Retail Sales' }, // 소매 판매
        { code: 'BAA10YM', name: "Moody's Baa Corporate Bond Yield Relative to 10-Year Treasury Yield" }, // 무디스 Baa 회사채 수익률과 10년 만기 국채 수익률의 차이
        { code: 'HOUST', name: 'Housing Starts' }, // 주택 착공 건수
        { code: 'CES0500000003', name: 'Average Hourly Earnings of All Employees' }, // 평균 시간당 임금
        { code: 'A191RL1Q225SBEA', name: 'Real Gross Domestic Product' }, // 실질 GDP
    ]

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

    const requests = indicators.map(async (indicator) => {
        const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${indicator.code}&api_key=${process.env.FRED_API_KEY}&file_type=json&observation_start=${startDate}&observation_end=${endDate}`

        let response
        try {
            response = await $fetch(url)

            const latestObservation = response.observations.pop() // 가장 최신의 데이터를 사용

            return {
                name: indicator.name,
                date: latestObservation.date,
                value: transferUnit(indicator.code, latestObservation.value), // 지표 값
            }
        } catch (e) {
            console.log('e', e)
            return {
                name: indicator.name,
                date: '',
                value: 0
            }
        }
    })

    const result = await Promise.all(requests)

    // 새로운 데이터를 캐시에 저장
    cachedData = result
    cacheTimestamp = now

    return result
})
