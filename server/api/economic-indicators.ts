import { defineEventHandler } from 'h3'
import { $fetch } from 'ohmyfetch'
import dayjs from 'dayjs'
import { kv } from '@vercel/kv'

const DATA_KEY = 'economic-indicators'
const DATA_TTL = 600

// 미리 정의된 데이터 (production 환경이 아닐 때 사용)
const predefinedData = [
    { name: 'Gross Domestic Product (GDP)', date: '2024-09-30', value: '21.85B' },
    { name: 'Unemployment Rate', date: '2024-09-30', value: '4.3%' },
    { name: 'CPI: All Items in U.S. City Average', date: '2024-09-30', value: '275.10 (1982-1984=100)' },
    { name: 'Effective Federal Funds Rate', date: '2024-09-30', value: '0.50%' },
    { name: 'Industrial Production Index', date: '2024-09-30', value: '112.3 (2017=100)' },
    { name: 'Nonfarm Payrolls', date: '2024-09-30', value: '150.5M' },
    { name: '10-Year Treasury Constant Maturity Rate', date: '2024-09-30', value: '1.60%' },
    { name: 'M2 Money Stock', date: '2024-09-30', value: '18.5B' },
    { name: 'Retail Sales', date: '2024-09-30', value: '590.1M' },
    { name: "Moody's Baa Corporate Bond Yield Relative to 10-Year Treasury Yield", date: '2024-09-30', value: '1.10%' },
    { name: 'Housing Starts', date: '2024-09-30', value: '1.60 Thousands of Units' },
    { name: 'Average Hourly Earnings of All Employees', date: '2024-09-30', value: '30.2 Dollars per Hour' },
    { name: 'Real Gross Domestic Product', date: '2024-09-30', value: '21.85B' }
]

export default defineEventHandler(async () => {
    if (process.env.NODE_ENV !== 'production') {
        return predefinedData
    }

    let stockCache: object[] = []
    try {
        stockCache = await kv.get(DATA_KEY) as object[]
    } catch (e) { }

    if (stockCache?.length > 0) {
        return stockCache
    }

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
    await kv.set(DATA_KEY, JSON.stringify(result), { ex: DATA_TTL })
    return result
})
