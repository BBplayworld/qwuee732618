import { defineEventHandler, getQuery, createError } from 'h3'
import { clearFileCache, writeUpdateState, executeDefensiveReset, clearEconomicFileCache, readFileCache, readEconomicFileCache, readUpdateState } from '~/server/utils/cache'

// 어드민 개인키 환경 변수에서 가져오기
const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY

interface ClearCacheResponse {
  success: boolean
  message: string
  timestamp: number
  clearedItems: string[]
}

interface ReadCacheResponse {
  success: boolean
  message: string
  timestamp: number
  data: {
    stocks: any[] | null
    economic: any[] | null
    updateState: any
    cacheInfo: {
      stocksCacheExists: boolean
      economicCacheExists: boolean
      stocksCacheSize: number
      economicCacheSize: number
    }
  }
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const providedKey = query.key as string
  const actionType = (query.type as string) || 'cache' // 'cache' | 'full' | 'defensive' | 'read'

  // 1. 어드민 키 검증
  if (!ADMIN_SECRET_KEY) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Admin secret key not configured',
    })
  }

  if (!providedKey) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Admin key required. Use ?key=YOUR_ADMIN_KEY',
    })
  }

  if (providedKey !== ADMIN_SECRET_KEY) {
    console.warn(`[A1] Unauthorized attempt: ${providedKey?.substring(0, 4)}***`)
    throw createError({
      statusCode: 403,
      statusMessage: 'Invalid admin key',
    })
  }

  const timestamp = Date.now()

  try {
    // 캐시 읽기 요청 처리
    if (actionType === 'read') {
      console.log(`[A2] Cache read requested`)

      const [stocksCache, economicCache, updateState] = await Promise.all([readFileCache(), readEconomicFileCache(), readUpdateState()])

      const response: ReadCacheResponse = {
        success: true,
        message: 'Cache data retrieved successfully',
        timestamp,
        data: {
          stocks: stocksCache,
          economic: economicCache,
          updateState,
          cacheInfo: {
            stocksCacheExists: stocksCache !== null,
            economicCacheExists: economicCache !== null,
            stocksCacheSize: stocksCache ? stocksCache.length : 0,
            economicCacheSize: economicCache ? economicCache.length : 0,
          },
        },
      }

      console.log(`[A3] Cache read completed: stocks=${stocksCache?.length || 0}, economic=${economicCache?.length || 0}`)
      return response
    }

    // 캐시 클리어 요청 처리
    const clearedItems: string[] = []
    console.log(`[A2] Cache clear requested: ${actionType}`)

    switch (actionType) {
      case 'defensive':
        await executeDefensiveReset()
        await clearEconomicFileCache()
        clearedItems.push('stocks_cache', 'economic_cache', 'update_state', 'defensive_reset')
        break

      default:
        throw createError({
          statusCode: 400,
          statusMessage: 'Invalid action type. Use: cache, full, defensive, or read',
        })
    }

    const response: ClearCacheResponse = {
      success: true,
      message: `Cache cleared successfully (${actionType} mode)`,
      timestamp,
      clearedItems,
    }

    console.log(`[A3] Cache clear completed: ${clearedItems.join(', ')}`)
    return response
  } catch (error: any) {
    console.error('[A4] Admin operation failed:', error)

    throw createError({
      statusCode: 500,
      statusMessage: `Admin operation failed: ${error?.message || 'Unknown error'}`,
    })
  }
})
