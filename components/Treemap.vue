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

// 트리맵 노드 생성 함수
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
        .attr('stroke', 'white')
        .attr('stroke-width', 2)
        .attr('rx', 8)
        .attr('ry', 8)

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

    // 회사명 표시
    foreignObject
        .append('div')
        .attr('class', 'node-name')
        .style('font-size', (d) => `${func.calcName(d).size}px`)
        .style('margin-top', '5px')
        .style('color', (d) => d.data['dp'] > 3 ? 'black' : 'white')
        .style('line-height', '1.2')
        .html((d) => {
            const displayName = getDisplayName(d.data)
            const originalName = d.data.name
            // 다국어명과 원래명이 다른 경우에만 두 줄로 표시
            if (displayName !== originalName && originalName) {
                return `<strong>${originalName}</strong><br><span style="font-size: 0.8em; opacity: 0.8;">${displayName}</span>`
            } else {
                return `<strong>${originalName}</strong>`
            }
        })

    // 변화율 표시
    const nodeChange = foreignObject
        .append('div')
        .attr('class', 'node-change')
        .style('font-size', (d) => `${func.calcChange(d).size}px`)
        .style('margin', '5px 10px 0 10px')
        .style('color', (d) => d.data['dp'] > 3 ? 'black' : 'white')
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
            let currentValue = targetValue - 5
            const intervalId = setInterval(() => {
                if (currentValue < targetValue) {
                    currentValue += 0.2
                    node.html(`<strong>${icon}${currentValue.toFixed(2)} (${Math.round(d.data['dp'] * 100) / 100}%)</strong>`)
                } else {
                    clearInterval(intervalId)
                    node.html(`<strong>${icon}${targetValue} (${Math.round(d.data['dp'] * 100) / 100}%)</strong>`)
                }
            }, 20)
        })
    }

    return node
}

// 소형 섹터용 노드 생성 함수 (margin 차이만 있음)
function createSmallSectorNodes(svg, root, className, transform, isFetch = false) {
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
        .attr('stroke', 'white')
        .attr('stroke-width', 2)
        .attr('rx', 8)
        .attr('ry', 8)

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

    // 회사명 표시
    foreignObject
        .append('div')
        .attr('class', 'node-name')
        .style('font-size', (d) => `${func.calcName(d).size}px`)
        .style('margin-top', '5px')
        .style('color', (d) => d.data['dp'] > 3 ? 'black' : 'white')
        .style('line-height', '1.2')
        .html((d) => {
            const displayName = getDisplayName(d.data)
            const originalName = d.data.name
            // 다국어명과 원래명이 다른 경우에만 두 줄로 표시
            if (displayName !== originalName && originalName) {
                return `<strong>${originalName}</strong><br><span style="font-size: 0.8em; opacity: 0.8;">${displayName}</span>`
            } else {
                return `<strong>${originalName}</strong>`
            }
        })

    // 변화율 표시
    const nodeChange = foreignObject
        .append('div')
        .attr('class', 'node-change')
        .style('font-size', (d) => `${func.calcChange(d).size}px`)
        .style('margin-top', '4px')
        .style('color', (d) => d.data['dp'] > 3 ? 'black' : 'white')
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
            let currentValue = targetValue - 5
            const intervalId = setInterval(() => {
                if (currentValue < targetValue) {
                    currentValue += 0.2
                    node.html(`<strong>${icon}${currentValue.toFixed(2)} (${Math.round(d.data['dp'] * 100) / 100}%)</strong>`)
                } else {
                    clearInterval(intervalId)
                    node.html(`<strong>${icon}${targetValue} (${Math.round(d.data['dp'] * 100) / 100}%)</strong>`)
                }
            }, 20)
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

let func = {
    getColor(change) {
        if (change > 3) {
            return '#32D732' // 강한 상승
        } else if (change > 2) {
            return '#28ac28' // 상승
        } else if (change > 1) {
            return '#1e811e' // 상승
        } else if (change > 0) {
            return '#145614' // 상승
        } else if (change == 0) {
            return '#051505' // 동일
        } else if (change < -3) {
            return '#d73232' // 강한 하락
        } else if (change < -2) {
            return '#ac2828' // 하락
        } else if (change < -1) {
            return '#811e1e' // 하락
        } else if (change < 0) {
            return '#561414' // 하락
        }
    },
    calcSector(d) {
        let size = d.value / 50

        if (window.innerWidth < 767) size = 10

        return {
            size,
        }
    },
    calcName(d) {
        // 박스 크기에 비례하여 텍스트 크기 계산
        const boxWidth = d.x1 - d.x0
        const boxHeight = d.y1 - d.y0
        const boxArea = boxWidth * boxHeight

        // 박스 면적을 기준으로 텍스트 크기 계산
        let size = Math.sqrt(boxArea) / 13

        if (window.innerWidth < 767) {
            size = Math.min(13, Math.max(8, size))
        } else {
            size = Math.min(26, Math.max(17, size)) // 최소 10px, 최대 24px
        }

        return {
            size,
        }
    },
    calcChange(d) {
        // 박스 크기에 비례하여 텍스트 크기 계산
        const boxWidth = d.x1 - d.x0
        const boxHeight = d.y1 - d.y0
        const boxArea = boxWidth * boxHeight

        // 박스 면적을 기준으로 텍스트 크기 계산 (이름보다 약간 작게)
        let size = Math.sqrt(boxArea) / 30

        if (window.innerWidth < 767) {
            size = Math.min(11, Math.max(6, size))
        } else {
            size = Math.min(35, Math.max(16.5, size)) // 최소 8px, 최대 18px
        }

        return {
            size,
        }
    },
}

function createTreemap({ isFetch = false }) {
    let width = treemapContainer.value.getBoundingClientRect().width
    if (window.innerWidth < 1700 && window.innerWidth >= 767) width = window.innerWidth * 0.89
    if (window.innerWidth < 767) width = window.innerWidth

    // 1. sector별로 그룹화
    const grouped = items.value.reduce((acc, item) => {
        if (!acc[item.sector]) acc[item.sector] = []
        acc[item.sector].push(item)
        return acc
    }, {})
    const sectorList = Object.keys(grouped)

    // 2. sector별로 marketCap 비율로 높이 배분 (100 기준으로 정규화)
    const totalMarketCap = items.value.reduce((sum, item) => sum + item.marketCap, 0)
    const minSectorHeight = 150
    const sectorSpacing = 24
    const sectorHeaderHeight = 40
    let availableHeight = 0.8 * (window.innerHeight || 1000)
    if (availableHeight < 800) availableHeight = 800

    // marketCap을 100 기준으로 정규화하여 각 개별 항목의 크기 조정
    const normalizedItems = items.value.map(item => ({
        ...item,
        originalMarketCap: item.marketCap, // 원래 값 보존 (텍스트 크기 계산용)
        normalizedMarketCap: Math.max((item.marketCap / totalMarketCap) * 100, 5) // 최소값 1로 설정
    }))

    // 정규화된 값으로 sector별 그룹화 업데이트
    const normalizedGrouped = normalizedItems.reduce((acc, item) => {
        if (!acc[item.sector]) acc[item.sector] = []
        acc[item.sector].push(item)
        return acc
    }, {})

    let sectorHeights = sectorList.map((sector) => {
        const cap = normalizedGrouped[sector].reduce((sum, item) => sum + item.normalizedMarketCap, 0)
        return Math.max(Math.round(availableHeight * (cap / 100)), minSectorHeight)
    })

    // 3. 소형 섹터(5개 이하)와 대형 섹터 분리
    const smallSectors = sectorList.filter((sector) => grouped[sector].length <= 5)
    const largeSectors = sectorList.filter((sector) => grouped[sector].length > 5)

    // 4. 전체 SVG 높이 계산
    let totalHeight = 0
    // 대형 섹터 높이
    largeSectors.forEach((sector, idx) => {
        totalHeight += sectorHeights[sectorList.indexOf(sector)] + sectorHeaderHeight + sectorSpacing
    })

    // 소형 섹터는 한 줄에 최대 5개씩, 한 줄당 높이(헤더+트리맵)만큼 추가
    let viewSectorCount = 4
    let smallSectorRows = []
    for (let i = 0; i < smallSectors.length; i += viewSectorCount) {
        smallSectorRows.push(smallSectors.slice(i, i + viewSectorCount))
    }
    totalHeight += smallSectorRows.length * (minSectorHeight + sectorHeaderHeight + sectorSpacing)
    if (largeSectors.length + smallSectorRows.length > 0) totalHeight -= sectorSpacing

    // 5. svg 생성
    const svg = d3.select(treemapContainer.value).html('').append('svg').attr('width', width).attr('height', totalHeight).style('height', 'auto')

    // 6. 대형 섹터(기존대로 세로)
    let yOffset = 0
    largeSectors.forEach((sector, idx) => {
        svg.append('rect').attr('x', 0).attr('y', yOffset).attr('width', width).attr('height', sectorHeaderHeight).attr('fill', '#222').attr('rx', 8).attr('ry', 8)
        svg
            .append('text')
            .attr('x', 21)
            .attr('y', yOffset + sectorHeaderHeight / 2 + 7)
            .attr('class', 'sector-header')
            .style('font-size', window.innerWidth < 767 ? '15px' : '18px')
            .style('font-weight', 'bold')
            .style('fill', '#fff')
            .text(sector)

        yOffset += sectorHeaderHeight

        const root = d3
            .hierarchy({ children: normalizedGrouped[sector] })
            .sum((d) => d.normalizedMarketCap)
            .sort((a, b) => b.value - a.value)
        d3
            .treemap()
            .size([width, sectorHeights[sectorList.indexOf(sector)]])
            .padding(10)(root)

        // 트리맵 노드 생성
        createTreemapNodes(
            svg,
            root,
            `treemap-node-large-${idx}`,
            (d) => `translate(${d.x0},${d.y0 + yOffset})`,
            isFetch
        )

        yOffset += sectorHeights[sectorList.indexOf(sector)] + sectorSpacing
    })

    // 7. 소형 섹터 한 줄에 최대 viewSectorCount개씩 가로 배치
    smallSectorRows.forEach((row, rowIdx) => {
        let sectorColGap = 16
        let colCount = row.length
        let colWidth = (width - sectorColGap * (colCount - 1)) / colCount
        let maxHeight = minSectorHeight
        // 각 소형 섹터별로 헤더+트리맵
        row.forEach((sector, colIdx) => {
            let x = colIdx * (colWidth + sectorColGap)
            // 헤더
            svg.append('rect').attr('x', x).attr('y', yOffset).attr('width', colWidth).attr('height', sectorHeaderHeight).attr('fill', '#222').attr('rx', 8).attr('ry', 8)
            svg
                .append('text')
                .attr('x', x + 21)
                .attr('y', yOffset + sectorHeaderHeight / 2 + 7)
                .attr('class', 'sector-header')
                .style('font-size', window.innerWidth < 767 ? '12px' : '18px')
                .style('font-weight', 'bold')
                .style('fill', '#fff')
                .text(sector)

            // 트리맵(해당 colWidth, minSectorHeight 내에서)
            const root = d3
                .hierarchy({ children: normalizedGrouped[sector] })
                .sum((d) => d.normalizedMarketCap)
                .sort((a, b) => b.value - a.value)
            d3.treemap().size([colWidth, minSectorHeight]).padding(10)(root)

            // 트리맵 노드 생성
            createSmallSectorNodes(
                svg,
                root,
                `treemap-node-small-${rowIdx}-${colIdx}`,
                (d) => `translate(${x + d.x0},${yOffset + sectorHeaderHeight + d.y0})`,
                isFetch
            )
        })
        yOffset += sectorHeaderHeight + minSectorHeight + sectorSpacing
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
    margin: 0 0 20px 10px;
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
    margin-right: 15px;
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
        margin: 0;
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
