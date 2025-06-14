import { promises as fs } from 'fs'
import { join } from 'path'

// 환경에 따른 캐시 파일 경로 설정
const isVercel = process.env.VERCEL === '1'
const CACHE_DIR = isVercel ? '/tmp' : join(process.cwd(), '.cache')
const CACHE_FILE = isVercel ? join('/tmp', 'stocks.json') : join(CACHE_DIR, 'stocks.json')

// 캐시 TTL 설정 (밀리초)
const CACHE_TTL = {
  MARKET_OPEN: 5 * 60 * 1000, // 5분
  MARKET_CLOSED: 12 * 60 * 60 * 1000, // 12시간
}

// 캐시 TTL 가져오기
export const getCacheTTL = () => {
  const now = new Date()
  const day = now.getDay()
  const hour = now.getHours()
  const isWeekend = day === 0 || day === 6
  const isMarketHours = !isWeekend && hour >= 9 && hour < 16

  return isMarketHours ? CACHE_TTL.MARKET_OPEN : CACHE_TTL.MARKET_CLOSED
}

// 캐시 디렉토리 생성 (로컬 환경에서만)
const ensureCacheDir = async () => {
  if (isVercel) return // Vercel에서는 /tmp가 이미 존재

  try {
    await fs.access(CACHE_DIR)
  } catch {
    await fs.mkdir(CACHE_DIR, { recursive: true })
  }
}

// 파일 캐시 읽기
export const readFileCache = async () => {
  try {
    await ensureCacheDir()
    const data = await fs.readFile(CACHE_FILE, 'utf-8')
    const cache = JSON.parse(data)

    // 캐시 만료 체크
    if (Date.now() - cache.timestamp > getCacheTTL()) {
      return null
    }

    return cache.data
  } catch {
    return null
  }
}

// 파일 캐시 쓰기
export const writeFileCache = async (data: any) => {
  try {
    await ensureCacheDir()
    const cache = {
      timestamp: Date.now(),
      data,
    }
    await fs.writeFile(CACHE_FILE, JSON.stringify(cache))
  } catch (error) {
    console.error('[ERROR] Failed to write cache:', error)
  }
}
