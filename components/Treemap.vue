<template>
    <div class="container-treemap">
        <div class="header">
            <div class="header-title">
                <h1>Market Treemap</h1>
            </div>
            <Copyright />
        </div>
        <div class="content">
            <div ref="treemapContainer" class="stocks-area">
            </div>
            <div class="indicators-area" v-if="economicIndicators.length > 0">
                <div ref="economicIndicatorsContainer" class="economic-indicators-container">
                </div>
                <!-- 향후 다른 지표들이 여기에 세로로 추가될 예정 -->
            </div>
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
const economicIndicatorsContainer = ref(null)
const items = ref([])
const economicIndicators = ref([])

// 전역 설정 및 상수
const MOBILE_BREAKPOINT = 767
const isMobile = () => window.innerWidth < MOBILE_BREAKPOINT

const CONFIG = {
    // ========== 레이아웃 설정 ==========
    layout: {
        // 그리드 기본 설정
        grid: {
            cols: { pc: 4, mobile: 2 },        // 컬럼 수
            gap: { pc: 15, mobile: 20 },       // 간격
            baseHeight: { pc: 210, mobile: 200 } // 기본 높이
        },

        // 섹터 타입별 통합 설정
        sectorTypes: {
            large: {
                // 분류 기준 (둘 중 하나만 만족하면 대형)
                minMarketCapRatio: 0.25,        // 마켓캡 25% 이상
                minStockCount: 8,               // 주식 8개 이상
                // 레이아웃
                colSpan: { pc: 2, mobile: 2 },  // 2x1 크기
                heightMultiplier: 2.6,          // (중요) 높이 배율
                minHeight: 1.8                  // 최소 높이 보장
            },
            medium: {
                // 분류 기준 (둘 중 하나만 만족하면 중형)
                minMarketCapRatio: 0.1,         // 마켓캡 10% 이상
                minStockCount: 4,               // 주식 4개 이상
                // 레이아웃
                colSpan: { pc: 1, mobile: 1 },  // 1x1 크기
                heightMultiplier: 1.4,          // (중요) 높이 배율
                minHeight: 1.1                  // 최소 높이 보장
            },
            small: {
                // 나머지는 모두 소형 (분류 기준 없음)
                colSpan: { pc: 1, mobile: 1 },  // 1x1 크기
                heightMultiplier: 1.0,          // (중요) 높이 배율
                minHeight: 1.0                  // 최소 높이 보장
            }
        },

        // 화면 크기 설정
        screen: {
            widthMultiplier: 0.87,           // 1700px 이하 PC 전체 폭 배율
            largeScreenMultiplier: 0.5,    // 1700px 이상 PC 전체 폭 배율
            breakpoint: 1700                // PC 대형/중형 구분 기준점
        },

        // 주식 영역 SVG 설정
        svg: {
            bottomPadding: 40       // SVG 하단 여백
        }
    },

    // ========== 개별 주식 박스 설정 ==========
    stockBox: {
        padding: {
            pc: 12,       // PC 개별 주식 박스 간격
            mobile: 8     // 모바일 개별 주식 박스 간격
        },
        textMargin: {
            name: {
                pc: '8px',
                mobile: '4px'
            },
            change: {
                pc: '0 12px 12px 12px',
                mobile: '2px 8px 8px 8px'
            }
        }
    },

    // ========== 텍스트 크기 설정 ==========
    textSize: {
        stock: {
            name: {
                pc: { min: 16, max: 26 },
                mobile: { min: 14, max: 17 }
            },
            change: {
                pc: { min: 15, max: 32 },
                mobile: { min: 12, max: 14 }
            }
        }
    },

    // ========== 색상 테마 설정 ==========
    colors: {
        // 주식 상승/하락 색상 (기본 초록/빨간색)
        stock: {
            strongUp: '#00ff00',      // 강한 상승 (3% 이상)
            up3: '#00be00',           // 상승 3 (2-3%)
            up2: '#00be00',           // 상승 2 (1-2%)
            up1: '#34b128',           // 상승 1 (0-1%)
            neutral: '#890000',       // 중립 (0%)
            down1: '#7c0000',         // 하락 1 (0 to -1%)
            down2: '#b60000',         // 하락 2 (-1 to -2%)
            down3: '#da0000',         // 하락 3 (-2 to -3%)
            strongDown: '#ff200c'     // 강한 하락 (-3% 이하)
        },

        // 텍스트 색상
        text: {
            primary: '#FFFFFF',       // 기본 텍스트
            secondary: '#B0BEC5',     // 보조 텍스트
            accent: '#4FC3F7',        // 강조 색상 (경제지표명 등)
            muted: '#b8b8b8',         // 흐린 텍스트 (날짜 등)
            onLight: '#000000',       // 밝은 배경 위 텍스트
            onDark: '#FFFFFF'         // 어두운 배경 위 텍스트
        },

        // 섹터 배경 색상
        sector: {
            header: '#263238',        // 섹터 헤더 배경
            background: '#37474F',    // 일반 섹터 배경
            economicIndicator: '#000000', // 경제지표 섹터 배경 (검은색)
            border: '#FFFFFF',        // 테두리 색상
            alternateRow: 'rgba(255,255,255,0.08)'  // 교대로 나타나는 행 배경
        },

        // 기타 UI 색상
        ui: {
            stroke: '#FFFFFF',        // 테두리
            strokeWidth: 2,           // 테두리 두께
            borderRadius: 8           // 모서리 둥글기
        }
    },

    // ========== 경제 지표 섹터 설정 ==========
    economicIndicators: {
        // 높이 배율 (기존 SVG 내 섹터용 - 현재 미사용)
        heightMultiplier: 2.5,

        // 별도 영역 레이아웃 설정
        layout: {
            containerWidth: { pc: 205, mobile: 220, largePC: 250 },  // SVG 내부 너비 (대형PC 확장)
            areaWidth: { pc: 205, mobile: 220, largePC: 250 },       // 전체 div 영역 너비 (대형PC 확장)
            headerHeight: { pc: 40, mobile: 35 },
            indicatorHeight: { pc: 97, mobile: 80 },
            gap: 15                                                  // 주식 영역과의 간격
        },

        // 폰트 크기
        fontSize: {
            pc: {
                indicatorName: 13,    // 지표명
                value: 13,            // 지표값
                date: 13              // 날짜
            },
            mobile: {
                indicatorName: 11,     // 지표명
                value: 11,             // 지표값
                date: 11               // 날짜
            }
        },

        // 간격 설정
        spacing: {
            itemMarginBottom: {
                pc: 8,
                mobile: 6
            },
            nameMarginBottom: 2,
            dateMarginTop: 2
        },

        // 패딩 설정
        padding: {
            pc: 12,
            mobile: 8
        },

        // 표시 개수 (모든 지표 표시)
        showAllIndicators: true
    },

    // ========== 기타 설정 ==========
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

// 섹터 크기 설정 가져오기 함수
function getSectorConfig(sizeClass) {
    switch (sizeClass) {
        case 3: return CONFIG.layout.sectorTypes.large
        case 2: return CONFIG.layout.sectorTypes.medium
        case 1:
        default: return CONFIG.layout.sectorTypes.small
    }
}

// 섹터 높이 계산 함수
function calculateSectorHeight(sectorData, gridConfig) {
    const { sizeClass } = sectorData
    const sectorConfig = getSectorConfig(sizeClass)

    return {
        height: gridConfig.baseHeight * sectorConfig.heightMultiplier,
        heightMultiplier: sectorConfig.heightMultiplier,
        colSpan: isMobile() ? sectorConfig.colSpan.mobile : sectorConfig.colSpan.pc
    }
}

// 최적 컬럼 찾기 함수
function findBestColumn(colSpan, columnStacks, economicIndicatorSlot) {
    let bestColumnIndex = -1

    if (colSpan === 2) {
        // 대형 섹터(2x1): 연속된 2개 컬럼 중 가장 낮은 위치 선택
        let minCombinedHeight = Infinity
        for (let i = 0; i <= columnStacks.length - 2; i++) {
            const combinedHeight = Math.max(columnStacks[i].totalHeight, columnStacks[i + 1].totalHeight)
            if (combinedHeight < minCombinedHeight) {
                minCombinedHeight = combinedHeight
                bestColumnIndex = i
            }
        }
    } else {
        // 소형/중형 섹터(1x1): 가장 낮은 컬럼 선택
        let minHeight = Infinity
        for (let i = 0; i < columnStacks.length; i++) {
            // 경제 지표 슬롯이 있는 컬럼은 스킵
            if (economicIndicatorSlot && i === economicIndicatorSlot.col) continue

            if (columnStacks[i].totalHeight < minHeight) {
                minHeight = columnStacks[i].totalHeight
                bestColumnIndex = i
            }
        }
    }

    return bestColumnIndex
}

// 강제 배치 함수 (모든 섹터 표시 보장)
function forceColumnPlacement(colSpan, columnStacks, economicIndicatorSlot) {
    if (colSpan === 2) {
        // 대형 섹터: 첫 번째 사용 가능한 2개 컬럼 위치
        return 0
    } else {
        // 소형/중형 섹터: 가장 낮은 컬럼 강제 배치
        let minHeight = Infinity
        let bestIndex = 0

        for (let i = 0; i < columnStacks.length; i++) {
            if (economicIndicatorSlot && i === economicIndicatorSlot.col) continue
            if (columnStacks[i].totalHeight < minHeight) {
                minHeight = columnStacks[i].totalHeight
                bestIndex = i
            }
        }
        return bestIndex
    }
}

// 섹터를 컬럼에 배치하는 함수
function placeSectorInColumn(sectorData, columnIndex, columnStacks, gridConfig) {
    const { colSpan, height } = sectorData
    const targetColumn = columnStacks[columnIndex]
    const sectorWidth = gridConfig.baseWidth * colSpan + gridConfig.gap * (colSpan - 1)

    const placedSector = {
        ...sectorData.meta,
        x: targetColumn.x,
        y: targetColumn.totalHeight,
        actualY: targetColumn.totalHeight,
        width: sectorWidth,
        height: height,
        colSpan: colSpan,
        heightMultiplier: sectorData.heightMultiplier
    }

    // 컬럼 정보 업데이트
    targetColumn.sectors.push(placedSector)
    targetColumn.totalHeight += height + gridConfig.gap

    // 2x1 섹터인 경우 다음 컬럼도 동기화
    if (colSpan === 2 && columnIndex + 1 < columnStacks.length) {
        const nextColumn = columnStacks[columnIndex + 1]
        nextColumn.totalHeight = Math.max(nextColumn.totalHeight, targetColumn.totalHeight)
    }

    return placedSector
}

// 텍스트 색상 결정 함수
function getTextColor(dp) {
    if (dp > 3) return 'black'        // 강한 상승 시 검은색
    if (dp < -3) return '#ddd'        // 강한 하락 시 연한 회색 
    return 'white'                    // 기본 - 흰색
}

// 통합 트리맵 노드 생성 함수
function createTreemapNodes(svg, root, className, transform, isFetch = false) {
    const node = svg
        .selectAll(`g.${className}`)
        .data(root.leaves())
        .enter()
        .append('g')
        .attr('class', `treemap-node ${className}`)
        .attr('transform', transform)

    // 박스 생성
    node
        .append('rect')
        .attr('width', (d) => d.x1 - d.x0)
        .attr('height', (d) => d.y1 - d.y0)
        .attr('fill', (d) => func.getColor(d.data['dp']))
        .attr('stroke', (d) => d.data.isGuest ? CONFIG.colors.text.accent : CONFIG.colors.ui.stroke)
        .attr('stroke-width', (d) => d.data.isGuest ? 1 : CONFIG.colors.ui.strokeWidth)
        .attr('stroke-dasharray', (d) => d.data.isGuest ? '3,3' : 'none')
        .attr('rx', CONFIG.colors.ui.borderRadius)
        .attr('ry', CONFIG.colors.ui.borderRadius)

    // 텍스트 컨테이너 생성
    const foreignObject = node
        .append('foreignObject')
        .attr('x', 0)
        .attr('y', 5)
        .attr('width', (d) => d.x1 - d.x0)
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
        return isMobile() ? CONFIG.stockBox.textMargin.name.mobile : CONFIG.stockBox.textMargin.name.pc
    }

    foreignObject
        .append('div')
        .attr('class', 'node-name')
        .style('font-size', (d) => `${func.calcName(d).size}px`)
        .style('margin-top', getNameMargin())
        .style('color', (d) => getTextColor(d.data['dp']))
        .style('line-height', '1.4')
        .style('padding', '0 4px')
        .html((d) => {
            const displayName = getDisplayName(d.data)
            const originalName = d.data.name
            const isGuest = d.data.isGuest
            const originalSector = d.data.originalSector

            // 게스트 주식인 경우 원래 섹터명 표시
            const sectorBadge = isGuest && originalSector ?
                `<div style="font-size: 0.6em; opacity: 0.7; margin-bottom: 2px; color: ${CONFIG.colors.text.accent}; font-weight: bold;">[${originalSector}]</div>` : ''

            if (displayName !== originalName && originalName) {
                return `${sectorBadge}<strong>${originalName}</strong><br><span style="font-size: 0.8em; opacity: 0.8;">${displayName}</span>`
            } else {
                return `${sectorBadge}<strong>${originalName}</strong>`
            }
        })

    // 변화율 표시 마진 (CONFIG화)
    const getChangeMargin = () => {
        return isMobile() ? CONFIG.stockBox.textMargin.change.mobile : CONFIG.stockBox.textMargin.change.pc
    }

    const nodeChange = foreignObject
        .append('div')
        .attr('class', 'node-change')
        .style('font-size', (d) => `${func.calcChange(d).size}px`)
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

// 별도 영역에 경제 지표 SVG 생성 함수
function createEconomicIndicatorsSVG() {
    if (!economicIndicatorsContainer.value || economicIndicators.value.length === 0) return

    // 경제지표 영역 크기 계산 (CONFIG에서 가져오기)
    const containerWidth = isMobile() ?
        CONFIG.economicIndicators.layout.containerWidth.mobile :
        (window.innerWidth >= CONFIG.layout.screen.breakpoint ?
            CONFIG.economicIndicators.layout.containerWidth.largePC :
            CONFIG.economicIndicators.layout.containerWidth.pc)
    const indicatorHeight = isMobile() ?
        CONFIG.economicIndicators.layout.indicatorHeight.mobile :
        CONFIG.economicIndicators.layout.indicatorHeight.pc
    const headerHeight = isMobile() ?
        CONFIG.economicIndicators.layout.headerHeight.mobile :
        CONFIG.economicIndicators.layout.headerHeight.pc
    const totalHeight = headerHeight + (economicIndicators.value.length * indicatorHeight)

    // 기존 SVG 제거 후 새로 생성
    const svg = d3.select(economicIndicatorsContainer.value).html('').append('svg')
        .attr('width', containerWidth)
        .attr('height', totalHeight)
        .style('height', 'auto')

    // 헤더 생성
    createEconomicIndicatorsHeader(svg, 0, 0, containerWidth, headerHeight)

    // 경제 지표 목록 세로 배치
    economicIndicators.value.forEach((indicator, index) => {
        const y = headerHeight + (index * indicatorHeight)
        createEconomicIndicatorItem(svg, 0, y, containerWidth, indicatorHeight, indicator, index)
    })
}

// 경제 지표 헤더 생성 함수
function createEconomicIndicatorsHeader(svg, x, y, width, height) {
    // 헤더 배경
    svg.append('rect')
        .attr('x', x)
        .attr('y', y)
        .attr('width', width)
        .attr('height', height)
        .attr('fill', CONFIG.colors.sector.header)
        .attr('rx', CONFIG.colors.ui.borderRadius)
        .attr('ry', CONFIG.colors.ui.borderRadius)

    // 헤더 텍스트
    svg.append('foreignObject')
        .attr('x', x + 12)
        .attr('y', y + 8)
        .attr('width', width - 24)
        .attr('height', height - 16)
        .append('xhtml:div')
        .attr('class', 'indicator-header')
        .style('font-size', isMobile() ? '12px' : '14px')
        .style('font-weight', 'bold')
        .style('color', CONFIG.colors.text.primary)
        .style('display', 'flex')
        .style('align-items', 'center')
        .style('justify-content', 'center')
        .style('height', '100%')
        .text((() => {
            const lang = getBrowserLanguage()
            const titles = {
                en: 'Economic Indicators',
                ko: '경제 지표',
                zh: '经济指标'
            }
            return titles[lang] || titles.en
        })())
}

// 개별 경제 지표 아이템 생성 함수
function createEconomicIndicatorItem(svg, x, y, width, height, indicator, index) {
    const padding = isMobile() ? 8 : 12

    // 아이템 배경 (교대로 색상 변경)
    svg.append('rect')
        .attr('x', x)
        .attr('y', y)
        .attr('width', width)
        .attr('height', height)
        .attr('fill', index % 2 === 0 ? CONFIG.colors.sector.economicIndicator : CONFIG.colors.sector.alternateRow)
        .attr('rx', CONFIG.colors.ui.borderRadius)
        .attr('ry', CONFIG.colors.ui.borderRadius)

    // 텍스트 컨테이너
    const textContainer = svg.append('foreignObject')
        .attr('x', x + padding)
        .attr('y', y + padding)
        .attr('width', width - padding * 2)
        .attr('height', height - padding * 2)
        .append('xhtml:div')
        .style('height', '100%')
        .style('display', 'flex')
        .style('flex-direction', 'column')
        .style('justify-content', 'center')

    // 지표명
    const displayName = getDisplayName(indicator)
    const fontConfig = isMobile() ? CONFIG.economicIndicators.fontSize.mobile : CONFIG.economicIndicators.fontSize.pc

    textContainer.append('div')
        .style('font-weight', 'bold')
        .style('font-size', `${fontConfig.indicatorName}px`)
        .style('color', CONFIG.colors.text.accent)
        .style('margin-bottom', '4px')
        .style('line-height', '1.3')
        .text(displayName)

    // 지표값
    textContainer.append('div')
        .style('font-size', `${fontConfig.value}px`)
        .style('color', CONFIG.colors.text.primary)
        .style('font-weight', 'bold')
        .style('margin-bottom', '2px')
        .html(`${indicator.value}`)

    // 날짜
    if (indicator.date) {
        textContainer.append('div')
            .style('font-size', `${fontConfig.date}px`)
            .style('color', CONFIG.colors.text.muted)
            .text(indicator.date)
    }
}



const fetchEconomicIndicators = async () => {
    try {
        const { data } = await useFetch('/api/economic-indicators', {
            retry: false,
        })
        if (data.value) {
            economicIndicators.value = data.value
        }
    } catch (error) {
        console.warn('Failed to fetch economic indicators:', error)
    }
}

const fetch = async () => {
    const { data } = await useFetch('/api/stocks', {
        retry: false,
    })

    if (!data.value) {
        return setTimeout(fetch, 100)
    }

    items.value = data.value

    // 경제 지표도 함께 가져오기
    await fetchEconomicIndicators()

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
        const colors = CONFIG.colors.stock

        if (change > 3) return colors.strongUp
        if (change > 2) return colors.up3
        if (change > 1) return colors.up2
        if (change > 0) return colors.up1
        if (change === 0) return colors.neutral
        if (change < -3) return colors.strongDown
        if (change < -2) return colors.down3
        if (change < -1) return colors.down2
        return colors.down1
    },

    calcSector(d) {
        return { size: isMobile() ? 10 : d.value / 50 }
    },

    calcName(d) {
        const boxArea = (d.x1 - d.x0) * (d.y1 - d.y0)
        let size = Math.sqrt(boxArea) / 13

        const config = isMobile() ? CONFIG.textSize.stock.name.mobile : CONFIG.textSize.stock.name.pc
        size = Math.min(config.max, Math.max(config.min, size))

        return { size }
    },

    calcChange(d) {
        const boxArea = (d.x1 - d.x0) * (d.y1 - d.y0)
        let size = Math.sqrt(boxArea) / 30

        const config = isMobile() ? CONFIG.textSize.stock.change.mobile : CONFIG.textSize.stock.change.pc
        size = Math.min(config.max, Math.max(config.min, size))

        return { size }
    }
}

function createTreemap({ isFetch = false }) {
    // 화면 크기에 따른 width 계산
    const indicatorAreaWidth = economicIndicators.value.length > 0 ?
        (isMobile() ?
            CONFIG.economicIndicators.layout.areaWidth.mobile :
            (window.innerWidth >= CONFIG.layout.screen.breakpoint ?
                CONFIG.economicIndicators.layout.areaWidth.largePC :
                CONFIG.economicIndicators.layout.areaWidth.pc)) + CONFIG.economicIndicators.layout.gap : 0 // 지표 영역 + gap

    let width = treemapContainer.value.getBoundingClientRect().width
    if (window.innerWidth < CONFIG.layout.screen.breakpoint && window.innerWidth >= MOBILE_BREAKPOINT) {
        // 중형 PC (1700px 이하)
        width = (window.innerWidth * CONFIG.layout.screen.widthMultiplier) - indicatorAreaWidth
    } else if (window.innerWidth >= CONFIG.layout.screen.breakpoint && !isMobile()) {
        // 대형 PC (1700px 이상) - 85vw 컨테이너 내에서 경제지표 제외한 너비
        const containerWidth = window.innerWidth * CONFIG.layout.screen.largeScreenMultiplier
        width = containerWidth - indicatorAreaWidth
    } else if (!isMobile()) {
        // 기타 PC 환경
        width = width - indicatorAreaWidth
    }

    if (isMobile()) {
        width = window.innerWidth - 10 // 모바일은 전체 너비 사용 (세로 배치)
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
        originalMarketCap: item.marketCap,
        normalizedMarketCap: Math.max((item.marketCap / totalMarketCap) * CONFIG.normalizationBase, CONFIG.minNormalizedValue)
    }))

    // 정규화된 값으로 sector별 그룹화 업데이트
    const normalizedGrouped = normalizedItems.reduce((acc, item) => {
        if (!acc[item.sector]) acc[item.sector] = []
        acc[item.sector].push(item)
        return acc
    }, {})

    // 섹터별 마켓캡 합계 및 메타데이터 계산
    const sectorMetadata = sectorList.map(sector => {
        const sectorMarketCap = normalizedGrouped[sector].reduce((sum, item) => sum + item.normalizedMarketCap, 0)
        const stockCount = grouped[sector].length
        const marketCapRatio = sectorMarketCap / CONFIG.normalizationBase

        // 섹터 크기 등급 결정 (1: 소형, 2: 중형, 3: 대형)
        let sizeClass = 1
        if (marketCapRatio >= CONFIG.layout.sectorTypes.large.minMarketCapRatio || stockCount >= CONFIG.layout.sectorTypes.large.minStockCount) {
            sizeClass = 3  // 대형
        } else if (marketCapRatio >= CONFIG.layout.sectorTypes.medium.minMarketCapRatio || stockCount >= CONFIG.layout.sectorTypes.medium.minStockCount) {
            sizeClass = 2  // 중형
        }

        return {
            sector,
            marketCap: sectorMarketCap,
            stockCount,
            marketCapRatio,
            sizeClass
        }
    }).sort((a, b) => {
        // 크기 클래스 우선, 같으면 마켓캡 순으로 정렬 (빈 공간 최소화)
        if (a.sizeClass !== b.sizeClass) {
            return b.sizeClass - a.sizeClass // 큰 섹터부터
        }
        return b.marketCap - a.marketCap
    })

    // 그리드 레이아웃 계산
    const device = isMobile() ? 'mobile' : 'pc'
    const gridConfig = {
        cols: CONFIG.layout.grid.cols[device],
        gap: CONFIG.layout.grid.gap[device],
        baseWidth: width / CONFIG.layout.grid.cols[device] - CONFIG.layout.grid.gap[device] * (CONFIG.layout.grid.cols[device] - 1) / CONFIG.layout.grid.cols[device],
        baseHeight: CONFIG.layout.grid.baseHeight[device]
    }

    // 경제 지표는 별도 영역에서 처리하므로 SVG 내 예약 불필요

    // ========== 세로 스택 기반 섹터 레이아웃 계산 ==========
    const sectorLayout = []

    // 1. 컬럼 스택 초기화
    const columnStacks = Array.from({ length: gridConfig.cols }, (_, index) => ({
        columnIndex: index,
        x: index * (gridConfig.baseWidth + gridConfig.gap),
        sectors: [],
        totalHeight: 0
    }))

    // 2. 경제 지표는 별도 영역에서 처리하므로 컬럼 예약 불필요

    // 3. 섹터 우선순위 정렬 (대형 → 중형 → 소형 순)
    const sectorsToPlace = [...sectorMetadata].sort((a, b) => {
        if (a.sizeClass !== b.sizeClass) {
            return b.sizeClass - a.sizeClass // 큰 섹터 우선
        }
        return b.marketCap - a.marketCap // 같은 크기면 마켓캡 순
    })

    // 4. 각 섹터를 최적 위치에 배치
    sectorsToPlace.forEach((sectorMeta) => {
        // 섹터 크기 및 높이 계산
        const sectorDimensions = calculateSectorHeight(sectorMeta, gridConfig)

        // 최적 컬럼 찾기
        let bestColumnIndex = findBestColumn(
            sectorDimensions.colSpan,
            columnStacks,
            null // 경제 지표 슬롯 없음
        )

        // 강제 배치 (모든 섹터 표시 보장)
        if (bestColumnIndex < 0) {
            bestColumnIndex = forceColumnPlacement(
                sectorDimensions.colSpan,
                columnStacks,
                null // 경제 지표 슬롯 없음
            )
        }

        // 섹터 배치 실행
        if (bestColumnIndex >= 0) {
            const sectorLayoutData = {
                meta: sectorMeta,
                ...sectorDimensions
            }

            const placedSector = placeSectorInColumn(
                sectorLayoutData,
                bestColumnIndex,
                columnStacks,
                gridConfig
            )

            sectorLayout.push(placedSector)
        }
    })

    // 전체 SVG 높이 계산 (가장 높은 컬럼 기준)
    const maxColumnHeight = Math.max(...columnStacks.map(col => col.totalHeight))
    const totalHeight = maxColumnHeight + CONFIG.layout.svg.bottomPadding // CONFIG화된 하단 여백

    // 주식 영역 SVG 생성
    const svg = d3.select(treemapContainer.value).html('').append('svg')
        .attr('width', width)
        .attr('height', totalHeight)
        .style('height', 'auto')

    // 경제 지표는 별도 영역에서 처리
    createEconomicIndicatorsSVG()

    // 주식 섹터 렌더링
    sectorLayout.forEach((layout, index) => {
        const { sector, x, actualY, width, height, sizeClass } = layout
        const headerHeight = isMobile() ? 50 : 55
        const fontSize = isMobile()
            ? (sizeClass === 3 ? '14px' : '12px')
            : (sizeClass === 3 ? '16px' : '14px')

        // 섹터 헤더
        svg.append('rect')
            .attr('x', x)
            .attr('y', actualY)
            .attr('width', width)
            .attr('height', headerHeight)
            .attr('fill', CONFIG.colors.sector.header)
            .attr('rx', CONFIG.colors.ui.borderRadius)
            .attr('ry', CONFIG.colors.ui.borderRadius)

        svg.append('foreignObject')
            .attr('x', x + 12)
            .attr('y', actualY + 8)
            .attr('width', width - 24)
            .attr('height', headerHeight - 16)
            .append('xhtml:div')
            .attr('class', 'sector-header')
            .style('font-size', fontSize)
            .style('font-weight', 'bold')
            .style('color', CONFIG.colors.text.primary)
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('height', '100%')
            .style('word-wrap', 'break-word')
            .style('overflow-wrap', 'break-word')
            .style('white-space', 'pre-wrap')
            .text(sector)

        // 현재 섹터의 주식들
        const sectorStocks = normalizedGrouped[sector] || []
        const treemapHeight = height - headerHeight
        const padding = isMobile() ? 8 : 12

        // 현재 섹터 주식들의 트리맵 생성
        if (sectorStocks.length > 0) {
            const root = d3.hierarchy({ children: sectorStocks })
                .sum(d => d.normalizedMarketCap)
                .sort((a, b) => b.value - a.value)

            d3.treemap()
                .size([width, treemapHeight])
                .padding(padding)(root)

            // 사용된 영역 계산
            const usedArea = root.leaves().reduce((total, d) => {
                return total + (d.x1 - d.x0) * (d.y1 - d.y0)
            }, 0)

            const totalArea = width * treemapHeight
            const utilization = usedArea / totalArea

            // 공간 활용도가 70% 미만이면 다른 섹터 주식으로 빈 공간 채우기
            if (utilization < 0.7) {
                // 다른 섹터의 주식들 중에서 추가할 주식들 선별
                const otherSectorStocks = []
                Object.keys(normalizedGrouped).forEach(otherSector => {
                    if (otherSector !== sector) {
                        normalizedGrouped[otherSector].forEach(stock => {
                            otherSectorStocks.push({
                                ...stock,
                                originalSector: stock.sector,
                                isGuest: true // 게스트 주식 표시
                            })
                        })
                    }
                })

                // 추가할 주식 개수 계산 (빈 공간 비율에 따라)
                const emptySpaceRatio = 1 - utilization
                const additionalStockCount = Math.min(
                    Math.floor(otherSectorStocks.length * emptySpaceRatio * 0.8),
                    otherSectorStocks.length
                )

                // 마켓캡 순으로 정렬하여 상위 주식들 선택
                const selectedAdditionalStocks = otherSectorStocks
                    .sort((a, b) => b.normalizedMarketCap - a.normalizedMarketCap)
                    .slice(0, additionalStockCount)

                // 현재 섹터 주식 + 선별된 다른 섹터 주식으로 새로운 트리맵 생성
                const combinedStocks = [...sectorStocks, ...selectedAdditionalStocks]

                const combinedRoot = d3.hierarchy({ children: combinedStocks })
                    .sum(d => d.normalizedMarketCap)
                    .sort((a, b) => b.value - a.value)

                d3.treemap()
                    .size([width, treemapHeight])
                    .padding(padding)(combinedRoot)

                // 통합 트리맵 노드 생성
                createTreemapNodes(
                    svg,
                    combinedRoot,
                    `treemap-node-${index}`,
                    d => `translate(${x + d.x0}, ${actualY + headerHeight + d.y0})`,
                    isFetch
                )
            } else {
                // 공간 활용도가 충분하면 기존 섹터 주식만 표시
                createTreemapNodes(
                    svg,
                    root,
                    `treemap-node-${index}`,
                    d => `translate(${x + d.x0}, ${actualY + headerHeight + d.y0})`,
                    isFetch
                )
            }
        }
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
    position: relative;
    flex: 1 1 auto;
    min-height: 0;
    overflow: hidden;
    display: flex;
    gap: 15px;
    align-items: flex-start;
    /* 상단 정렬 */
}

.stocks-area {
    flex: 1;
    min-width: 0;
}

.indicators-area {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 15px;
    position: relative;
}

.economic-indicators-container {
    background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
    border: 2px solid #4FC3F7;
    border-radius: 12px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
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

    /* 모바일에서 지표 영역을 세로 배치 */
    .content {
        flex-direction: column;
        gap: 0px;
    }

    .indicators-area {
        order: 2;
        /* 주식 영역 아래에 배치 */
        position: relative;
        left: 5px;
        /* 왼쪽 고정 */
    }

    .stocks-area {
        order: 1;
    }

    .economic-indicators-container {
        margin: 0;
        /* 왼쪽 정렬 */
        max-width: 100%;
        width: 100%;
        /* 모바일에서는 최대 너비 사용 */
        position: relative;
        left: 0;
        /* 왼쪽 고정 */
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
