<template>
    <div class="container-treemap">
        <div class="header">
            <div class="header-title">
                <h1>Market Treemap</h1>
            </div>
            <Copyright />
        </div>
        <div ref="treemapContainer" class="content">
        </div>
        <div class="bottom">
            <h5 class="description"><span style="color: #0073e6">ℹ️</span> This app provides a delayed real-time view of
                the market treemap, offering insights into overall trends and performance</h5>
            <div class="data-source">Data provided by <a href="https://finnhub.io" target="_blank">Finnhub</a></div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import * as d3 from 'd3'
import { useMarketOpen } from '~/composables/useMarketOpen'

const treemapContainer = ref(null)
const items = ref([])

// 전역 설정 및 상수
const MOBILE_BREAKPOINT = 767
const isMobile = () => window.innerWidth < MOBILE_BREAKPOINT

const CONFIG = {
    // ========== 섹터 배경 박스 설정 ==========
    largeSector: {
        headerHeight: {
            pc: 60,      // PC 대형 섹터 헤더 높이 (텍스트 여유공간 확보)
            mobile: 65   // 모바일 대형 섹터 헤더 높이
        },
        baseHeight: {
            pc: 100,     // PC 대형 섹터 기본 높이
            mobile: 100  // 모바일 대형 섹터 기본 높이
        },
        stockHeightBonus: {
            pc: 30,      // PC 대형 섹터 주식당 추가 높이
            mobile: 35   // 모바일 대형 섹터 주식당 추가 높이
        },
        minStockBonus: {
            pc: 120,     // PC 대형 섹터 최소 추가 높이
            mobile: 80  // 모바일 대형 섹터 최소 추가 높이
        }
    },

    smallSector: {
        headerHeight: {
            pc: 60,      // PC 소형 섹터 헤더 높이 (텍스트 여유공간 확보)
            mobile: 65   // 모바일 소형 섹터 헤더 높이 (더 큰 여유)
        },
        baseHeight: {
            pc: 130,     // PC 소형 섹터 기본 높이 (집중도)
            mobile: 130  // 모바일 소형 섹터 기본 높이 (충분한 크기)
        },
        stockHeightBonus: {
            pc: 40,      // PC 소형 섹터 주식당 추가 높이
            mobile: 100   // 모바일 소형 섹터 주식당 추가 높이
        },
        minStockBonus: {
            pc: 70,      // PC 소형 섹터 최소 추가 높이
            mobile: 30  // 모바일 소형 섹터 최소 추가 높이
        }
    },

    // ========== 개별 주식 박스 설정 ==========
    stockBox: {
        padding: {
            pc: 10,       // PC 개별 주식 박스 간격 (가독성)
            mobile: 15   // 모바일 개별 주식 박스 간격
        },
        textMargin: {
            name: {
                pc: { large: '8px', small: '6px' },
                mobile: '0px'
            },
            change: {
                pc: { large: '2px 10px 10px 10px', small: '0px 0px 0px 0px' },
                mobile: '0px 10px 0px 10px'
            }
        }
    },

    // ========== 전체 레이아웃 설정 ==========
    layout: {
        sectorSpacing: {
            pc: 40,      // PC 섹터 간 간격 (집중도)
            mobile: 28   // 모바일 섹터 간 간격
        },
        availableHeight: {
            pc: 0,       // PC 전체 높이 비율 (집중도)
            mobile: 0.8  // 모바일 전체 높이 비율
        },
        viewSectorCount: {
            pc: 5,       // PC 소형 섹터 한 줄당 개수
            mobile: 3    // 모바일 소형 섹터 한 줄당 개수
        },
        colGap: {
            pc: 16,      // PC 컬럼 간격
            mobile: 10    // 모바일 컬럼 간격
        },
        headerGap: {
            mobile: 12   // 모바일 헤더 하단 간격
        },
        widthMultiplier: {
            pc: 0.9      // PC 전체 폭 배율
        },
        mobileWidthBonus: 10  // 모바일 소형 섹터 폭 보너스
    },

    // ========== 텍스트 크기 설정 ==========
    textSize: {
        sector: {
            pc: { large: '18px', small: '18px' },
            mobile: { large: '15px', small: '12px' }
        },
        stock: {
            name: {
                pc: { min: 18, max: 28 },
                mobile: {
                    large: { min: 14, max: 16 },
                    small: { min: 15, max: 16 }
                }
            },
            change: {
                pc: { min: 17, max: 36 },
                mobile: {
                    large: { min: 13, max: 14 },
                    small: { min: 13, max: 14 }
                }
            }
        }
    },

    // ========== 기타 설정 ==========
    maxStocksPerSmallSector: 5,
    normalizationBase: 100,
    minNormalizedValue: 5,
    animationSpeed: 20,
    animationStep: 0.2,
    animationOffset: 5
}

// 브라우저 언어 감지 함수
function getBrowserLanguage() {
    const supportedLanguages = ['en', 'ko', 'zh']
    const browserLang = navigator.language || navigator.languages?.[0] || 'en'

    // 언어 코드에서 주 언어만 추출 (예: 'ko-KR' -> 'ko')
    const primaryLang = browserLang.split('-')[0]

    // 지원하는 언어인지 확인
    return supportedLanguages.includes(primaryLang) ? primaryLang : 'en'
}

// 다국어 표시명 가져오기 함수
function getDisplayName(data) {
    const currentLang = getBrowserLanguage()

    // displayName이 객체인지 확인
    if (data.displayName && typeof data.displayName === 'object') {
        // 현재 언어로 표시명 찾기
        if (data.displayName[currentLang]) {
            return data.displayName[currentLang]
        }
        // 현재 언어가 없으면 영어로 fallback
        if (data.displayName.en) {
            return data.displayName.en
        }
        // 영어도 없으면 첫 번째 값 사용
        const firstKey = Object.keys(data.displayName)[0]
        if (firstKey) {
            return data.displayName[firstKey]
        }
    }

    // displayName이 없거나 문자열인 경우 name을 fallback으로 사용
    return data.displayName || data.name || 'Unknown'
}

// 텍스트 색상 결정 함수
function getTextColor(dp) {
    if (dp > 3) return 'black'        // 강한 상승
    if (dp < -3) return '#ddd'     // 강한 하락 
    return 'white'                    // 기본 - 흰색
}

// 통합 트리맵 노드 생성 함수
function createTreemapNodes(svg, root, className, transform, isFetch = false) {
    const isSmallSector = className.includes('small')

    const node = svg
        .selectAll(`g.${className}`)
        .data(root.leaves())
        .enter()
        .append('g')
        .attr('class', `treemap-node ${className}`)
        .attr('transform', transform)

    // 박스 생성 (소형 섹터는 모바일에서 width 추가)
    node
        .append('rect')
        .attr('width', (d) => (d.x1 - d.x0) + (isSmallSector && isMobile() ? CONFIG.layout.mobileWidthBonus : 0))
        .attr('height', (d) => d.y1 - d.y0)
        .attr('fill', (d) => func.getColor(d.data['dp']))
        .attr('stroke', 'white')
        .attr('stroke-width', 2)
        .attr('rx', 8)
        .attr('ry', 8)

    // 텍스트 컨테이너 생성
    const foreignObject = node
        .append('foreignObject')
        .attr('x', 0)
        .attr('y', 5)
        .attr('width', (d) => (d.x1 - d.x0) + (isSmallSector && isMobile() ? CONFIG.layout.mobileWidthBonus : 0))
        .attr('height', (d) => d.y1 - d.y0 - 5)
        .append('xhtml:div')
        .attr('class', 'node-container')
        .style('display', 'flex')
        .style('flex-direction', 'column')
        .style('justify-content', 'center')
        .style('align-items', 'center')
        .style('height', '100%')
        .style('text-align', 'center')
        .style('word-wrap', 'break-word')
        .style('overflow-wrap', 'break-word')

    // 회사명 표시 마진 (CONFIG화)
    const getNameMargin = () => {
        if (isMobile()) {
            return CONFIG.stockBox.textMargin.name.mobile
        }
        return isSmallSector ? CONFIG.stockBox.textMargin.name.pc.small : CONFIG.stockBox.textMargin.name.pc.large
    }

    foreignObject
        .append('div')
        .attr('class', 'node-name')
        .style('font-size', (d) => `${func.calcName(d, isSmallSector).size}px`)
        .style('margin-top', getNameMargin())
        .style('color', (d) => getTextColor(d.data['dp']))
        .style('line-height', '1.4')
        .style('padding', '0 4px')
        .html((d) => {
            const displayName = getDisplayName(d.data)
            const originalName = d.data.name
            if (displayName !== originalName && originalName) {
                return `<strong>${originalName}</strong><br><span style="font-size: 0.8em; opacity: 0.8;">${displayName}</span>`
            } else {
                return `<strong>${originalName}</strong>`
            }
        })

    // 변화율 표시 마진 (CONFIG화)
    const getChangeMargin = () => {
        if (isMobile()) {
            return CONFIG.stockBox.textMargin.change.mobile
        }
        return isSmallSector ? CONFIG.stockBox.textMargin.change.pc.small : CONFIG.stockBox.textMargin.change.pc.large
    }

    const nodeChange = foreignObject
        .append('div')
        .attr('class', 'node-change')
        .style('font-size', (d) => `${func.calcChange(d, isSmallSector).size}px`)
        .style('margin', getChangeMargin())
        .style('color', (d) => getTextColor(d.data['dp']))
        .html((d) => {
            const icon = d.data['dp'] > 0 ? '▲' : d.data['dp'] < 0 ? '▼' : ''
            return `<strong>${icon}${d.data['c']} (${Math.round(d.data['dp'] * 100) / 100}%)</strong>`
        })

    // 애니메이션 처리
    if (isFetch) {
        nodeChange.each(function (d) {
            const node = d3.select(this)
            const targetValue = d.data['c']
            const icon = d.data['dp'] > 0 ? '▲' : d.data['dp'] < 0 ? '▼' : ''
            let currentValue = targetValue - CONFIG.animationOffset
            const intervalId = setInterval(() => {
                if (currentValue < targetValue) {
                    currentValue += CONFIG.animationStep
                    node.html(`<strong>${icon}${currentValue.toFixed(2)} (${Math.round(d.data['dp'] * 100) / 100}%)</strong>`)
                } else {
                    clearInterval(intervalId)
                    node.html(`<strong>${icon}${targetValue} (${Math.round(d.data['dp'] * 100) / 100}%)</strong>`)
                }
            }, CONFIG.animationSpeed)
        })
    }

    return node
}

const fetch = async () => {
    const { data } = await useFetch('/api/stocks', {
        retry: false,
    })

    if (!data.value) {
        return setTimeout(fetch, 100)
    }

    items.value = data.value
    createTreemap({ isFetch: true })

    const { isMarketOpen } = useMarketOpen()
    if (!isMarketOpen) {
        return
    }

    setTimeout(fetch, 90000)
}

onMounted(() => {
    fetch()
})

// 스타일링 및 계산 함수들
const func = {
    getColor(change) {
        const colorMap = {
            strongUp: '#32D732',    // > 3
            up3: '#28ac28',         // > 2
            up2: '#1e811e',         // > 1
            up1: '#145614',         // > 0
            neutral: '#051505',     // == 0
            down1: '#561414',       // < 0
            down2: '#811e1e',       // < -1
            down3: '#ac2828',       // < -2
            strongDown: '#d73232'   // < -3
        }

        if (change > 3) return colorMap.strongUp
        if (change > 2) return colorMap.up3
        if (change > 1) return colorMap.up2
        if (change > 0) return colorMap.up1
        if (change === 0) return colorMap.neutral
        if (change < -3) return colorMap.strongDown
        if (change < -2) return colorMap.down3
        if (change < -1) return colorMap.down2
        return colorMap.down1
    },

    calcSector(d) {
        return { size: isMobile() ? 10 : d.value / 50 }
    },

    calcName(d, isSmallSector = false) {
        const boxArea = (d.x1 - d.x0) * (d.y1 - d.y0)
        let size = Math.sqrt(boxArea) / 13

        if (isMobile()) {
            const config = isSmallSector ? CONFIG.textSize.stock.name.mobile.small : CONFIG.textSize.stock.name.mobile.large
            size = Math.min(config.max, Math.max(config.min, size))
        } else {
            size = Math.min(CONFIG.textSize.stock.name.pc.max, Math.max(CONFIG.textSize.stock.name.pc.min, size))
        }

        return { size }
    },

    calcChange(d, isSmallSector = false) {
        const boxArea = (d.x1 - d.x0) * (d.y1 - d.y0)
        let size = Math.sqrt(boxArea) / 30

        if (isMobile()) {
            const config = isSmallSector ? CONFIG.textSize.stock.change.mobile.small : CONFIG.textSize.stock.change.mobile.large
            size = Math.min(config.max, Math.max(config.min, size))
        } else {
            size = Math.min(CONFIG.textSize.stock.change.pc.max, Math.max(CONFIG.textSize.stock.change.pc.min, size))
        }

        return { size }
    }
}

function createTreemap({ isFetch = false }) {
    // 화면 크기에 따른 width 계산
    let width = treemapContainer.value.getBoundingClientRect().width + 300
    if (window.innerWidth < 1700 && window.innerWidth >= MOBILE_BREAKPOINT) {
        width = window.innerWidth * CONFIG.layout.widthMultiplier.pc
    }
    if (isMobile()) {
        width = window.innerWidth - 10
    }

    // 섹터별 그룹화
    const grouped = items.value.reduce((acc, item) => {
        if (!acc[item.sector]) acc[item.sector] = []
        acc[item.sector].push(item)
        return acc
    }, {})
    const sectorList = Object.keys(grouped)
    const totalMarketCap = items.value.reduce((sum, item) => sum + item.marketCap, 0)

    // marketCap을 100 기준으로 정규화하여 각 개별 항목의 크기 조정
    const normalizedItems = items.value.map(item => ({
        ...item,
        originalMarketCap: item.marketCap, // 원래 값 보존 (텍스트 크기 계산용)
        normalizedMarketCap: Math.max((item.marketCap / totalMarketCap) * CONFIG.normalizationBase, CONFIG.minNormalizedValue)
    }))

    // 정규화된 값으로 sector별 그룹화 업데이트
    const normalizedGrouped = normalizedItems.reduce((acc, item) => {
        if (!acc[item.sector]) acc[item.sector] = []
        acc[item.sector].push(item)
        return acc
    }, {})

    // 유연한 섹터 높이 계산 (대형 섹터용)
    let sectorHeights = sectorList.map((sector) => {
        const cap = normalizedGrouped[sector].reduce((sum, item) => sum + item.normalizedMarketCap, 0)
        const stockCount = grouped[sector].length
        const availableHeight = isMobile()
            ? CONFIG.layout.availableHeight.mobile * (window.innerHeight || 1000)
            : CONFIG.layout.availableHeight.pc * (window.innerHeight || 900)
        const baseHeight = Math.round(availableHeight * (cap / CONFIG.normalizationBase))

        // 대형 섹터 주식 개수에 따른 추가 높이 보정
        const stockHeightBonus = isMobile() ? CONFIG.largeSector.stockHeightBonus.mobile : CONFIG.largeSector.stockHeightBonus.pc
        const minStockBonus = isMobile() ? CONFIG.largeSector.minStockBonus.mobile : CONFIG.largeSector.minStockBonus.pc
        const largeSectorBaseHeight = isMobile() ? CONFIG.largeSector.baseHeight.mobile : CONFIG.largeSector.baseHeight.pc
        const stockCountBonus = Math.max(stockCount * stockHeightBonus, minStockBonus)
        return Math.max(baseHeight + stockCountBonus, largeSectorBaseHeight)
    })

    // 소형/대형 섹터 분리 (CONFIG 사용)
    const smallSectors = sectorList.filter((sector) => grouped[sector].length <= CONFIG.maxStocksPerSmallSector)
    const largeSectors = sectorList.filter((sector) => grouped[sector].length > CONFIG.maxStocksPerSmallSector)

    // 전체 SVG 높이 계산
    let totalHeight = 0
    const sectorSpacing = isMobile() ? CONFIG.layout.sectorSpacing.mobile : CONFIG.layout.sectorSpacing.pc

    // 대형 섹터 높이
    largeSectors.forEach((sector, idx) => {
        const headerHeight = isMobile() ? CONFIG.largeSector.headerHeight.mobile : CONFIG.largeSector.headerHeight.pc
        totalHeight += sectorHeights[sectorList.indexOf(sector)] + headerHeight + sectorSpacing
    })

    // 소형 섹터 행별 그룹화
    const smallSectorRows = []
    const viewCount = isMobile() ? CONFIG.layout.viewSectorCount.mobile : CONFIG.layout.viewSectorCount.pc
    for (let i = 0; i < smallSectors.length; i += viewCount) {
        smallSectorRows.push(smallSectors.slice(i, i + viewCount))
    }
    const headerGapForHeight = isMobile() ? CONFIG.layout.headerGap.mobile : 0
    // 소형 섹터 각 행별 동적 높이 계산
    smallSectorRows.forEach(row => {
        const maxRowHeight = Math.max(...row.map(sector => {
            const stockCount = grouped[sector].length
            const baseHeight = isMobile() ? CONFIG.smallSector.baseHeight.mobile : CONFIG.smallSector.baseHeight.pc
            const stockHeightBonus = isMobile() ? CONFIG.smallSector.stockHeightBonus.mobile : CONFIG.smallSector.stockHeightBonus.pc
            const minStockBonus = isMobile() ? CONFIG.smallSector.minStockBonus.mobile : CONFIG.smallSector.minStockBonus.pc
            const stockCountBonus = Math.max(stockCount * stockHeightBonus, minStockBonus)
            return baseHeight + stockCountBonus
        }))
        const headerHeight = isMobile() ? CONFIG.smallSector.headerHeight.mobile : CONFIG.smallSector.headerHeight.pc
        totalHeight += headerHeight + headerGapForHeight + maxRowHeight + sectorSpacing
    })
    if (largeSectors.length + smallSectorRows.length > 0) totalHeight -= sectorSpacing

    // SVG 생성
    const svg = d3.select(treemapContainer.value).html('').append('svg').attr('width', width).attr('height', totalHeight).style('height', 'auto')

    // 대형 섹터 렌더링
    let yOffset = 0
    largeSectors.forEach((sector, idx) => {
        const headerHeight = isMobile() ? CONFIG.largeSector.headerHeight.mobile : CONFIG.largeSector.headerHeight.pc
        const fontSize = isMobile() ? CONFIG.textSize.sector.mobile.large : CONFIG.textSize.sector.pc.large

        svg.append('rect').attr('x', 0).attr('y', yOffset).attr('width', width).attr('height', headerHeight).attr('fill', '#222').attr('rx', 8).attr('ry', 8)
        svg
            .append('foreignObject')
            .attr('x', isMobile() ? 10 : 21)
            .attr('y', yOffset + 5)
            .attr('width', width - (isMobile() ? 20 : 42))
            .attr('height', headerHeight - 10)
            .append('xhtml:div')
            .attr('class', 'sector-header')
            .style('font-size', fontSize)
            .style('font-weight', 'bold')
            .style('color', '#fff')
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('height', '100%')
            .style('word-wrap', 'break-word')
            .style('overflow-wrap', 'break-word')
            .style('white-space', 'pre-wrap')
            .text(sector)

        yOffset += headerHeight

        const root = d3
            .hierarchy({ children: normalizedGrouped[sector] })
            .sum((d) => d.normalizedMarketCap)
            .sort((a, b) => b.value - a.value)
        const enhancedHeight = sectorHeights[sectorList.indexOf(sector)]
        const padding = isMobile() ? CONFIG.stockBox.padding.mobile : CONFIG.stockBox.padding.pc
        d3
            .treemap()
            .size([width, enhancedHeight])
            .padding(padding)(root)

        // 트리맵 노드 생성
        createTreemapNodes(
            svg,
            root,
            `treemap-node-large-${idx}`,
            (d) => `translate(${d.x0},${d.y0 + yOffset})`,
            isFetch
        )

        yOffset += enhancedHeight + sectorSpacing
    })

    // 소형 섹터 렌더링
    smallSectorRows.forEach((row, rowIdx) => {
        const sectorColGap = isMobile() ? CONFIG.layout.colGap.mobile : CONFIG.layout.colGap.pc
        const colCount = row.length
        const colWidth = (width - sectorColGap * (colCount - 1)) / colCount
        const headerHeight = isMobile() ? CONFIG.smallSector.headerHeight.mobile : CONFIG.smallSector.headerHeight.pc
        const fontSize = isMobile() ? CONFIG.textSize.sector.mobile.small : CONFIG.textSize.sector.pc.small

        // 각 소형 섹터별로 헤더+트리맵
        row.forEach((sector, colIdx) => {
            const x = colIdx * (colWidth + sectorColGap)
            // 헤더
            svg.append('rect').attr('x', x).attr('y', yOffset).attr('width', colWidth).attr('height', headerHeight).attr('fill', '#222').attr('rx', 8).attr('ry', 8)
            svg
                .append('foreignObject')
                .attr('x', x + (isMobile() ? 8 : 21))
                .attr('y', yOffset + 5)
                .attr('width', colWidth - (isMobile() ? 16 : 42))
                .attr('height', headerHeight - 10)
                .append('xhtml:div')
                .attr('class', 'sector-header')
                .style('font-size', fontSize)
                .style('font-weight', 'bold')
                .style('color', '#fff')
                .style('display', 'flex')
                .style('align-items', 'center')
                .style('height', '100%')
                .style('word-wrap', 'break-word')
                .style('overflow-wrap', 'break-word')
                .style('white-space', 'pre-wrap')
                .text(sector)

            // 트리맵 생성
            const root = d3
                .hierarchy({ children: normalizedGrouped[sector] })
                .sum((d) => d.normalizedMarketCap)
                .sort((a, b) => b.value - a.value)

            // 소형 섹터 동적 높이 계산
            const stockCount = grouped[sector].length
            const baseHeight = isMobile() ? CONFIG.smallSector.baseHeight.mobile : CONFIG.smallSector.baseHeight.pc
            const stockHeightBonus = isMobile() ? CONFIG.smallSector.stockHeightBonus.mobile : CONFIG.smallSector.stockHeightBonus.pc
            const minStockBonus = isMobile() ? CONFIG.smallSector.minStockBonus.mobile : CONFIG.smallSector.minStockBonus.pc
            const stockCountBonus = Math.max(stockCount * stockHeightBonus, minStockBonus)
            const enhancedSmallHeight = baseHeight + stockCountBonus

            const padding = isMobile() ? CONFIG.stockBox.padding.mobile : CONFIG.stockBox.padding.pc
            d3.treemap().size([colWidth, enhancedSmallHeight]).padding(padding)(root)

            // 트리맵 노드 생성
            const headerGap = isMobile() ? CONFIG.layout.headerGap.mobile : 0
            createTreemapNodes(
                svg,
                root,
                `treemap-node-small-${rowIdx}-${colIdx}`,
                (d) => `translate(${x + d.x0},${yOffset + headerHeight + headerGap + d.y0})`,
                isFetch
            )
        })
        const headerGap = isMobile() ? CONFIG.layout.headerGap.mobile : 0
        // 소형 섹터 행의 최대 높이 계산
        const maxRowHeight = Math.max(...row.map(sector => {
            const stockCount = grouped[sector].length
            const baseHeight = isMobile() ? CONFIG.smallSector.baseHeight.mobile : CONFIG.smallSector.baseHeight.pc
            const stockHeightBonus = isMobile() ? CONFIG.smallSector.stockHeightBonus.mobile : CONFIG.smallSector.stockHeightBonus.pc
            const minStockBonus = isMobile() ? CONFIG.smallSector.minStockBonus.mobile : CONFIG.smallSector.minStockBonus.pc
            const stockCountBonus = Math.max(stockCount * stockHeightBonus, minStockBonus)
            return baseHeight + stockCountBonus
        }))
        yOffset += headerHeight + headerGap + maxRowHeight + sectorSpacing
    })
}
</script>

<style scoped>
/* 한국어 가독성을 위한 폰트 설정 */
* {
    font-family: 'Noto Sans KR', 'Malgun Gothic', 'Apple SD Gothic Neo', 'Nanum Gothic', sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
}

/* 트리맵 내 텍스트 최적화 */
.node-name,
.node-change,
.sector-header {
    font-family: 'Noto Sans KR', 'Malgun Gothic', 'Apple SD Gothic Neo', 'Nanum Gothic', sans-serif !important;
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    font-feature-settings: "kern" 1;
    word-wrap: break-word;
    word-break: break-all;
    white-space: pre-wrap;
    overflow-wrap: break-word;
}

h1,
h2 {
    color: #f08;
}

.sector-text-container {
    width: 100%;
    height: 40px;
    display: flex;
    justify-content: center;
    align-items: center;
}

.header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 0 10px 0 10px;
}

.header-title h1 {
    font-size: 2rem;
    margin: 0;
    font-weight: bold;
    line-height: 1.2;
}

.container-treemap {
    display: flex;
    flex-direction: column;
    min-width: 100%;
    padding: 10px;
}

.bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 30px;
}

.content {
    flex: 1 1 auto;
    min-height: 0;
    overflow: hidden;
}

.data-source {
    margin: 0px 35px 0 0;
    font-size: 12px;
    color: #666;
}

.data-source a {
    color: #0073e6;
    text-decoration: none;
}

.data-source a:hover {
    text-decoration: underline;
}

@media all and (max-width: 767px) {
    .container-treemap {
        padding: 3px;
        margin: 0 0 0 5px;
    }

    .header {
        flex-direction: column;
        align-items: flex-start;
        margin: 10px 10px 0 10px;
    }

    .header-title {
        width: 100%;
        box-sizing: border-box;
        margin-bottom: 10px;
    }

    .header-title h1 {
        font-size: 1.2rem;
        margin: 0;
        line-height: 1.3;
    }

    .bottom {
        margin: 50px 25px 20px 0;
    }

    .bottom .description {
        font-size: 12px;
        line-height: 15px;
        max-width: 50%;
    }

    .bottom .data-source {
        margin: 0;
        text-align: right;
    }
}

@media all and (min-width: 768px) {
    .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 10px;
    }

    .header-title h1 {
        font-size: 2rem;
        margin: 0;
        font-weight: bold;
        line-height: 1.2;
    }
}
</style>
