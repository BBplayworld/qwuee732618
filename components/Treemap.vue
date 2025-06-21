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
            <div class="indicators-area">
                <div ref="economicIndicatorsContainer" class="economic-indicators-container">
                </div>
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
const marketClosedUpdateStatus = ref({
    hasCompletedInitialUpdate: false,
    isBackgroundUpdateInProgress: false
})
const hasEconomicIndicatorsFetched = ref(false)

const CONFIG = {
    // ========== 전역 시스템 설정 ==========
    system: {
        // 타이밍 설정
        timing: {
            initialFetchDelay: 100,        // 초기 fetch 지연 시간 (ms)
            firstFetchInterval: 20 * 1000,      // 최초 서버 업데이트 확인 fetch 간격 (ms) - 20초마다
            fetchInterval: 120 * 1000,      // 주기적 fetch 간격 (ms) - 2분마다
            retryDelay: 100,              // fetch 실패시 재시도 지연 시간 (ms)
            containerReadyDelay: 100,      // 컨테이너 준비 대기 시간 (ms)
            // batchSize 제거 - 단일 호출로 변경
        },

        // 애니메이션 설정
        animation: {
            speed: 20,                    // 애니메이션 속도 (ms)
            step: 0.2,                    // 애니메이션 단계 크기
            offset: 5,                    // 애니메이션 시작 오프셋
        },

        // 화면 크기 및 브레이크포인트
        screen: {
            devices: {
                mobile: {
                    maxWidth: 767,              // 모바일 최대 너비
                    widthMultiplier: 0.98       // 모바일 화면 너비 배율
                },
                tablet: {
                    minWidth: 768,              // 태블릿 최소 너비
                    maxWidth: 1112,             // 태블릿 최대 너비
                    widthMultiplier: 0.96       // 태블릿 화면 너비 배율
                },
                pc: {
                    minWidth: 1113,             // PC 최소 너비
                    maxWidth: 2299,             // PC 최대 너비
                    widthMultiplier: 0.77       // PC 화면 너비 배율
                },
                largePc: {
                    minWidth: 2300,             // 대형 PC 최소 너비
                    widthMultiplier: 0.47       // 대형 PC 화면 너비 배율
                }
            }
        },

        // 데이터 처리 설정
        data: {
            normalizationBase: 100,           // 정규화 기준값
            minNormalizedValue: 5,           // 최소 정규화 값
            spaceUtilizationThreshold: 0.7,   // 공간 활용도 임계값 (70%)
            additionalStockRatio: 0.8         // 추가 주식 비율 (80%)
        }
    },

    // ========== 주식 트리맵 설정 ==========
    stocks: {
        // 전체 레이아웃 설정
        layout: {
            // 그리드 기본 설정
            grid: {
                cols: { pc: 4, mobile: 2, tablet: 3 },
                gap: { pc: 20, mobile: 20, tablet: 10 },
                baseHeight: { pc: 210, mobile: 200, tablet: 205 }
            },

            // SVG 영역 설정
            svg: {
                bottomPadding: 40       // SVG 하단 여백
            },

            // 트리맵 정렬 설정
            treemap: {
                widthAdjustment: 8,    // 트리맵 width 조정값 (섹터 헤더와 정렬용)
                positionAdjustment: 4  // 트리맵 x 위치 조정값 (왼쪽 이동)
            }
        },

        // 섹터 분류 및 크기 설정
        sectors: {
            // 섹터 크기 분류 기준
            classification: {
                stockCountThreshold: 10,    // 주식 개수 기준값 (높이 조정 기준)
                heightReduction: 0.5,       // 기준값 미만일 때 높이 감소 비율
                heightIncrease: {
                    level1: { threshold: 10, multiplier: 1.2 },  // 10개 이상
                    level2: { threshold: 15, multiplier: 1.45 }   // 15개 이상
                }
            },

            // 섹터 타입별 설정
            types: {
                large: {
                    // 분류 기준 (둘 중 하나만 만족하면 대형)
                    minMarketCapRatio: 0.25,        // 마켓캡 25% 이상
                    minStockCount: 8,               // 주식 8개 이상
                    // 레이아웃
                    colSpan: { pc: 2, mobile: 2, tablet: 2 },  // 2x1 크기
                    heightMultiplier: 2.6,          // 높이 배율
                    minHeight: 1.8                  // 최소 높이 보장
                },
                medium: {
                    // 분류 기준 (둘 중 하나만 만족하면 중형)
                    minMarketCapRatio: 0.1,         // 마켓캡 10% 이상
                    minStockCount: 4,               // 주식 4개 이상
                    // 레이아웃
                    colSpan: { pc: 1, mobile: 1, tablet: 1 },  // 1x1 크기
                    heightMultiplier: 1.4,          // 높이 배율
                    minHeight: 1.1                  // 최소 높이 보장
                },
                small: {
                    // 나머지는 모두 소형
                    colSpan: { pc: 1, mobile: 1, tablet: 1 },  // 1x1 크기
                    heightMultiplier: 1.0,          // 높이 배율
                    minHeight: 1.0                  // 최소 높이 보장
                }
            },

            // 섹터 헤더 설정
            header: {
                height: {
                    pc: 40,       // PC 섹터 헤더 높이
                    mobile: 45    // 모바일 섹터 헤더 높이
                },
                fontSize: {
                    pc: {
                        large: '16px',    // PC 대형 섹터 폰트
                        medium: '14px'    // PC 중소형 섹터 폰트
                    },
                    mobile: {
                        large: '14px',    // 모바일 대형 섹터 폰트
                        medium: '12px'    // 모바일 중소형 섹터 폰트
                    }
                },
                padding: {
                    pc: 12,       // PC 섹터 헤더 내부 패딩
                    mobile: 8     // 모바일 섹터 헤더 내부 패딩
                }
            }
        },

        // 개별 주식 박스 설정
        box: {
            // 박스 간격 및 패딩
            spacing: {
                padding: {
                    pc: 8,        // PC 개별 주식 박스 간격 (트리맵 padding)
                    mobile: 8     // 모바일 개별 주식 박스 간격 (트리맵 padding)
                },
                textPadding: {
                    pc: 8,        // PC 텍스트 영역 패딩
                    mobile: 6     // 모바일 텍스트 영역 패딩
                },
                foreignObjectPadding: {
                    pc: '0 4px',      // PC foreignObject 내부 패딩
                    mobile: '0 3px'   // 모바일 foreignObject 내부 패딩
                }
            },

            // 텍스트 마진 설정
            textMargin: {
                name: {
                    pc: '6px',      // PC 회사명 마진
                    mobile: '4px'   // 모바일 회사명 마진
                },
                change: {
                    pc: '2px 8px 8px 8px',    // PC 변화율 마진
                    mobile: '2px 8px 8px 8px'  // 모바일 변화율 마진
                }
            },

            // 텍스트 크기 설정 (가로세로 비율별)
            textSize: {
                name: {
                    pc: { min: 16, max: 26 },
                    mobile: { min: 14, max: 17 },
                    tablet: { min: 14, max: 20 }
                },
                change: {
                    pc: { min: 15, max: 32 },
                    mobile: { min: 12, max: 14 },
                    tablet: { min: 12, max: 16 }
                },
                // 가로세로 비율별 조정
                aspectRatio: {
                    wide: { threshold: 1.5, multiplier: { mobile: 1.2, tablet: 0.9 } },    // 가로가 긴 경우
                    tall: { threshold: 0.8, multiplier: { mobile: 0.8, tablet: 0.8 } }     // 세로가 긴 경우
                },
                // 환경별 기본 크기 조정
                baseMultiplier: {
                    tablet: { name: 0.7, change: 0.65 },  // 태블릿 기본 크기 조정
                    mobile: { name: 1.0, change: 1.0 }    // 모바일 기본 크기 조정
                }
            }
        },

        // 색상 설정
        colors: {
            // 주식 상승/하락 색상
            performance: {
                strongUp: '#00ff00',      // 강한 상승 (3% 이상)
                up3: '#00be00',           // 상승 3 (2-3%)
                up2: '#00be00',           // 상승 2 (1-2%)
                up1: '#34b128',           // 상승 1 (0-1%)
                neutral: '#3e3e3e',       // 중립 (0%)
                down1: '#7c0000',         // 하락 1 (0 to -1%)
                down2: '#b60000',         // 하락 2 (-1 to -2%)
                down3: '#da0000',         // 하락 3 (-2 to -3%)
                strongDown: '#ff200c'     // 강한 하락 (-3% 이하)
            },

            // 텍스트 색상 (성과별)
            text: {
                onStrongUp: 'black',      // 강한 상승 시 텍스트 색상
                onStrongDown: 'white',    // 강한 하락 시 텍스트 색상
                default: 'white',         // 기본 텍스트 색상
                // 모바일/태블릿 환경 조정
                mobile: {
                    strongUpThreshold: 1,   // 모바일에서 검정색 적용 기준 (1% 이상)
                    strongDownThreshold: -1 // 모바일에서 흰색 적용 기준 (-1% 이하)
                },
                pc: {
                    strongUpThreshold: 3,   // PC에서 검정색 적용 기준 (3% 이상)
                    strongDownThreshold: -3 // PC에서 연한 회색 적용 기준 (-3% 이하)
                }
            },

            // 색상 강도 조정 (모바일/태블릿용)
            intensity: {
                mobile: {
                    strongMultiplier: 1.5,  // 강한 변화 시 색상 강도
                    normalMultiplier: 1.2   // 일반 변화 시 색상 강도
                }
            }
        }
    },

    // ========== 경제 지표 설정 ==========
    economicIndicators: {
        // 레이아웃 설정
        layout: {
            // 영역 크기
            area: {
                containerWidth: { pc: 205, mobile: 205, largePC: 250 },  // SVG 내부 너비
                areaWidth: { pc: 205, mobile: 205, largePC: 250 },       // 전체 div 영역 너비
                gap: 15                                                  // 주식 영역과의 간격
            },

            // 개별 요소 크기
            elements: {
                headerHeight: { pc: 40, mobile: 35 },
                indicatorHeight: { pc: 97, mobile: 80 }
            },

            // 간격 설정
            spacing: {
                itemMarginBottom: { pc: 8, mobile: 6 },
                nameMarginBottom: 2,
                dateMarginTop: 2
            },

            // 패딩 설정
            padding: { pc: 12, mobile: 8 }
        },

        // 텍스트 설정
        text: {
            fontSize: {
                pc: {
                    header: '14px',       // PC 헤더 폰트
                    indicatorName: 13,    // 지표명
                    value: 13,            // 지표값
                    date: 13              // 날짜
                },
                mobile: {
                    header: '12px',       // 모바일 헤더 폰트
                    indicatorName: 11,    // 지표명
                    value: 11,            // 지표값
                    date: 11              // 날짜
                }
            }
        },

        // 표시 설정
        display: {
            showAllIndicators: true  // 모든 지표 표시 여부
        }
    },

    // ========== 공통 UI 설정 ==========
    ui: {
        // 색상 테마
        colors: {
            // 텍스트 색상
            text: {
                primary: '#FFFFFF',       // 기본 텍스트
                secondary: '#B0BEC5',     // 보조 텍스트
                accent: '#4FC3F7',        // 강조 색상 (경제지표명 등)
                muted: '#b8b8b8',         // 흐린 텍스트 (날짜 등)
                onLight: '#000000',       // 밝은 배경 위 텍스트
                onDark: '#FFFFFF'         // 어두운 배경 위 텍스트
            },

            // 배경 색상
            background: {
                sectorHeader: '#263238',        // 섹터 헤더 배경
                sectorBody: '#37474F',          // 일반 섹터 배경
                economicIndicator: '#000000',   // 경제지표 섹터 배경 (검은색)
                alternateRow: 'rgba(255,255,255,0.08)'  // 교대로 나타나는 행 배경
            },

            // 테두리 및 UI 요소
            border: {
                color: '#FFFFFF',         // 테두리 색상
                width: 2,                 // 테두리 두께
                radius: 4                 // 모서리 둥글기
            }
        }
    }
}

// 전역 설정 및 상수  
const isMobile = () => window.innerWidth <= CONFIG.system.screen.devices.mobile.maxWidth

// 브라우저 언어 감지 함수
function getBrowserLanguage() {
    const supportedLanguages = ['en', 'ko', 'zh']
    const browserLang = navigator.language || navigator.languages?.[0] || 'en'

    // 언어 코드에서 주 언어만 추출 (예: 'ko-KR' -> 'ko')
    const primaryLang = browserLang.split('-')[0]

    // 지원하는 언어인지 확인
    return supportedLanguages.includes(primaryLang) ? primaryLang : 'en'
}

// 모바일/태블릿 감지 함수 (iPad 포함)
function isMobileOrTabletDevice() {
    // 기본 모바일 브레이크포인트 체크
    if (isMobile()) {
        return true
    }

    // 패드 사이즈 체크 (PC에서도 테스트 가능)
    const isTabletSize = window.innerWidth >= CONFIG.system.screen.devices.tablet.minWidth &&
        window.innerWidth <= CONFIG.system.screen.devices.tablet.maxWidth

    if (isTabletSize) {
        return true
    }

    // User Agent 기반 감지
    const userAgent = navigator.userAgent.toLowerCase()
    const isTabletUA = /ipad|tablet|android(?!.*mobile)|kindle|silk|playbook|bb10/i.test(userAgent)
    if (isTabletUA) {
        return true
    }

    // iPad 특별 감지 (iOS 13+ iPad는 desktop user agent를 사용할 수 있음)
    const isIPad = /ipad/i.test(userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    if (isIPad) {
        return true
    }

    // 터치 기능 감지
    const hasTouchScreen = 'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        navigator.msMaxTouchPoints > 0
    if (hasTouchScreen) {
        return true
    }

    return false
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
        case 3: return CONFIG.stocks.sectors.types.large
        case 2: return CONFIG.stocks.sectors.types.medium
        case 1:
        default: return CONFIG.stocks.sectors.types.small
    }
}

// 섹터 높이 계산 함수
function calculateSectorHeight(sectorData, gridConfig) {
    const { sizeClass, stockCount } = sectorData
    const sectorConfig = getSectorConfig(sizeClass)
    const classification = CONFIG.stocks.sectors.classification

    // 섹터 내 주식 수에 따라 높이 조정
    let heightMultiplier = sectorConfig.heightMultiplier

    // 주식 수가 기준값 미만이면 높이를 줄임
    if (stockCount < classification.stockCountThreshold) {
        heightMultiplier *= classification.heightReduction
    } else {
        // 기준값 이상일 때는 단계별 높이 증가
        if (stockCount > classification.heightIncrease.level2.threshold) {
            heightMultiplier *= classification.heightIncrease.level2.multiplier
        } else if (stockCount > classification.heightIncrease.level1.threshold) {
            heightMultiplier *= classification.heightIncrease.level1.multiplier
        }
    }

    return {
        height: gridConfig.baseHeight * heightMultiplier,
        heightMultiplier: heightMultiplier,
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
    const isMobileOrTablet = isMobileOrTabletDevice()
    const textConfig = CONFIG.stocks.colors.text

    // 모바일/태블릿 환경
    if (isMobileOrTablet) {
        if (dp > textConfig.mobile.strongUpThreshold) return textConfig.onStrongUp
        if (dp < textConfig.mobile.strongDownThreshold) return textConfig.onStrongDown
        return textConfig.default
    }

    // PC 환경
    if (dp > textConfig.pc.strongUpThreshold) return textConfig.onStrongUp
    if (dp < textConfig.pc.strongDownThreshold) return '#ddd'  // PC는 연한 회색
    return textConfig.default
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
        .attr('stroke', (d) => d.data.isGuest ? CONFIG.ui.colors.text.accent : CONFIG.ui.colors.border.color)
        .attr('stroke-width', (d) => d.data.isGuest ? 1 : CONFIG.ui.colors.border.width)
        .attr('stroke-dasharray', (d) => d.data.isGuest ? '3,3' : 'none')
        .attr('rx', CONFIG.ui.colors.border.radius)
        .attr('ry', CONFIG.ui.colors.border.radius)

    // 모바일/패드 환경 감지
    const isMobileOrTablet = isMobileOrTabletDevice()

    if (isMobileOrTablet) {
        // 모바일/패드 환경: SVG text 요소 사용
        createMobileTextElements(node)
    } else {
        // 데스크톱 환경: foreignObject 사용
        createDesktopTextElements(node, isFetch)
    }

    return node
}

// 모바일/패드용 SVG text 요소 생성 함수
function createMobileTextElements(node) {
    // 텍스트 줄바꿈 헬퍼 함수
    function wrapText(text, maxWidth, fontSize) {
        if (!text || typeof text !== 'string') return ['']

        const words = text.split(' ')
        const lines = []
        let currentLine = ''

        // 간단한 문자 너비 추정 (실제 측정이 어려우므로 근사치 사용)
        const charWidth = fontSize * 0.6
        const maxCharsPerLine = Math.max(1, Math.floor(maxWidth / charWidth))

        for (let word of words) {
            if (!word) continue  // 빈 단어 건너뛰기

            const testLine = currentLine ? `${currentLine} ${word}` : word
            if (testLine.length <= maxCharsPerLine) {
                currentLine = testLine
            } else {
                if (currentLine) {
                    lines.push(currentLine)
                    currentLine = word
                } else {
                    // 단어가 너무 길면 강제로 잘라서 줄바꿈
                    while (word.length > 0) {
                        const chunk = word.substring(0, maxCharsPerLine)
                        lines.push(chunk)
                        word = word.substring(maxCharsPerLine)
                    }
                    currentLine = ''
                }
            }
        }

        if (currentLine) {
            lines.push(currentLine)
        }

        return lines.length > 0 ? lines : ['']
    }

    // 회사명 텍스트
    node.each(function (d) {
        const g = d3.select(this)
        const boxWidth = d.x1 - d.x0
        const boxHeight = d.y1 - d.y0
        const centerX = boxWidth / 2
        const centerY = boxHeight / 2

        const displayName = getDisplayName(d.data)
        const originalName = d.data.name
        const isGuest = d.data.isGuest
        const originalSector = d.data.originalSector

        // 텍스트 크기 계산
        const nameSize = func.calcName(d).size
        const changeSize = func.calcChange(d).size
        const textColor = getTextColor(d.data['dp'])

        // 텍스트 영역 여백 (패딩)
        const textPadding = isMobile() ? CONFIG.stocks.box.spacing.textPadding.mobile : CONFIG.stocks.box.spacing.textPadding.pc
        const availableWidth = boxWidth - (textPadding * 2)

        // 텍스트 데이터 준비
        const nameText = displayName !== originalName && originalName ? originalName : (originalName || displayName)
        const icon = d.data['dp'] > 0 ? '▲' : d.data['dp'] < 0 ? '▼' : ''
        const changeText = `${icon}${d.data['c']} (${Math.round(d.data['dp'] * 100) / 100}%)`

        // 각 텍스트의 줄 수 미리 계산
        const nameLines = wrapText(nameText, availableWidth, nameSize)
        const changeLines = wrapText(changeText, availableWidth, changeSize)
        const hasDisplayNameDiff = displayName !== originalName && originalName
        const hasGuestBadge = isGuest && originalSector

        // 전체 텍스트 높이 계산하여 정중앙에 배치
        const guestBadgeHeight = hasGuestBadge ? nameSize * 0.6 : 0
        const nameTextHeight = nameSize * 1.2 * nameLines.length
        const displayTextHeight = hasDisplayNameDiff ? nameSize * 0.8 * 1.2 * wrapText(displayName, availableWidth, nameSize * 0.8).length : 0
        const changeTextHeight = changeSize * 1.2 * changeLines.length
        const totalTextHeight = guestBadgeHeight + nameTextHeight + displayTextHeight + changeTextHeight

        // 정중앙부터 시작 (작은 박스의 경우 약간 아래로 조정)
        const centerOffset = boxHeight < 100 ? Math.max(3, boxHeight * 0.105) : Math.max(3, boxHeight * 0.04)
        let currentY = centerY - (totalTextHeight / 2) + centerOffset

        // 게스트 주식 배지
        if (hasGuestBadge) {
            g.append('text')
                .attr('x', centerX)
                .attr('y', currentY)
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'middle')
                .attr('fill', CONFIG.ui.colors.text.accent)
                .attr('font-size', nameSize * 0.6)
                .attr('font-weight', 'bold')
                .text(`[${originalSector}]`)
            currentY += guestBadgeHeight + 2
        }

        // 회사명
        const nameTextGroup = g.append('text')
            .attr('x', centerX)
            .attr('y', currentY)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('fill', textColor)
            .attr('font-size', nameSize)
            .attr('font-weight', 'bold')

        nameLines.forEach((line, index) => {
            nameTextGroup.append('tspan')
                .attr('x', centerX)
                .attr('dy', index === 0 ? 0 : nameSize * 1.2)
                .attr('fill', textColor)
                .text(line)
        })
        currentY += nameTextHeight

        // 부가 설명 (displayName이 다른 경우)
        if (hasDisplayNameDiff) {
            currentY += 2
            const displayLines = wrapText(displayName, availableWidth, nameSize * 0.8)
            const displayTextGroup = g.append('text')
                .attr('x', centerX)
                .attr('y', currentY)
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'middle')
                .attr('fill', textColor)
                .attr('font-size', nameSize * 0.8)
                .attr('opacity', 0.8)

            displayLines.forEach((line, index) => {
                displayTextGroup.append('tspan')
                    .attr('x', centerX)
                    .attr('dy', index === 0 ? 0 : nameSize * 0.8 * 1.2)
                    .attr('fill', textColor)
                    .text(line)
            })
            currentY += displayTextHeight
        }

        // 변화율 텍스트
        currentY += 4
        const changeTextGroup = g.append('text')
            .attr('x', centerX)
            .attr('y', currentY)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('fill', textColor)
            .attr('font-size', changeSize)
            .attr('font-weight', 'bold')

        changeLines.forEach((line, index) => {
            changeTextGroup.append('tspan')
                .attr('x', centerX)
                .attr('dy', index === 0 ? 0 : changeSize * 1.1)
                .attr('fill', textColor)
                .text(line)
        })
    })
}

// 데스크톱용 foreignObject 요소 생성 함수
function createDesktopTextElements(node, isFetch) {
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
        return isMobile() ? CONFIG.stocks.box.textMargin.name.mobile : CONFIG.stocks.box.textMargin.name.pc
    }

    foreignObject
        .append('div')
        .attr('class', 'node-name')
        .style('font-size', (d) => `${func.calcName(d).size}px`)
        .style('margin-top', getNameMargin())
        .style('color', (d) => getTextColor(d.data['dp']))
        .style('line-height', '1.4')
        .style('padding', isMobile() ? CONFIG.stocks.box.spacing.foreignObjectPadding.mobile : CONFIG.stocks.box.spacing.foreignObjectPadding.pc)
        .html((d) => {
            const displayName = getDisplayName(d.data)
            const originalName = d.data.name
            const isGuest = d.data.isGuest
            const originalSector = d.data.originalSector

            // 게스트 주식인 경우 원래 섹터명 표시
            const sectorBadge = isGuest && originalSector ?
                `<div style="font-size: 0.6em; opacity: 0.7; color: ${CONFIG.ui.colors.text.accent}; font-weight: bold;">[${originalSector}]</div>` : ''

            if (displayName !== originalName && originalName) {
                return `${sectorBadge}<strong>${originalName}</strong> <span style="font-size: 0.8em; opacity: 0.8;">${displayName}</span>`
            } else {
                return `${sectorBadge}<strong>${originalName}</strong>`
            }
        })

    // 변화율 표시 마진 (CONFIG화)
    const getChangeMargin = () => {
        return isMobile() ? CONFIG.stocks.box.textMargin.change.mobile : CONFIG.stocks.box.textMargin.change.pc
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
            let currentValue = targetValue - CONFIG.system.animation.offset
            const intervalId = setInterval(() => {
                if (currentValue < targetValue) {
                    currentValue += CONFIG.system.animation.step
                    node.html(`<strong>${icon}${currentValue.toFixed(2)} (${Math.round(d.data['dp'] * 100) / 100}%)</strong>`)
                } else {
                    clearInterval(intervalId)
                    node.html(`<strong>${icon}${targetValue} (${Math.round(d.data['dp'] * 100) / 100}%)</strong>`)
                }
            }, CONFIG.system.animation.speed)
        })
    }
}

// 별도 영역에 경제 지표 SVG 생성 함수
function createEconomicIndicatorsSVG() {
    if (!economicIndicatorsContainer.value || economicIndicators.value.length === 0) return

    // 경제지표 영역 크기 계산 (CONFIG에서 가져오기)
    const containerWidth = isMobile() ?
        CONFIG.economicIndicators.layout.area.containerWidth.mobile :
        (window.innerWidth >= CONFIG.system.screen.devices.largePc.minWidth ?
            CONFIG.economicIndicators.layout.area.containerWidth.largePC :
            CONFIG.economicIndicators.layout.area.containerWidth.pc)
    const indicatorHeight = isMobile() ?
        CONFIG.economicIndicators.layout.elements.indicatorHeight.mobile :
        CONFIG.economicIndicators.layout.elements.indicatorHeight.pc
    const headerHeight = isMobile() ?
        CONFIG.economicIndicators.layout.elements.headerHeight.mobile :
        CONFIG.economicIndicators.layout.elements.headerHeight.pc
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
        .attr('fill', CONFIG.ui.colors.background.sectorHeader)
        .attr('rx', CONFIG.ui.colors.border.radius)
        .attr('ry', CONFIG.ui.colors.border.radius)

    // 헤더 텍스트
    svg.append('foreignObject')
        .attr('x', x + CONFIG.economicIndicators.layout.padding[isMobile() ? 'mobile' : 'pc'])
        .attr('y', y + 8)
        .attr('width', width - (CONFIG.economicIndicators.layout.padding[isMobile() ? 'mobile' : 'pc'] * 2))
        .attr('height', height - 16)
        .append('xhtml:div')
        .attr('class', 'indicator-header')
        .style('font-size', isMobile() ? CONFIG.economicIndicators.text.fontSize.mobile.header : CONFIG.economicIndicators.text.fontSize.pc.header)
        .style('font-weight', 'bold')
        .style('color', CONFIG.ui.colors.text.primary)
        .style('display', 'flex')
        .style('align-items', 'center')
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
    const padding = isMobile() ? CONFIG.economicIndicators.layout.padding.mobile : CONFIG.economicIndicators.layout.padding.pc

    // 아이템 배경 (교대로 색상 변경)
    svg.append('rect')
        .attr('x', x)
        .attr('y', y)
        .attr('width', width)
        .attr('height', height)
        .attr('fill', index % 2 === 0 ? CONFIG.ui.colors.background.economicIndicator : CONFIG.ui.colors.background.alternateRow)
        .attr('rx', CONFIG.ui.colors.border.radius)
        .attr('ry', CONFIG.ui.colors.border.radius)

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
    const fontConfig = isMobile() ? CONFIG.economicIndicators.text.fontSize.mobile : CONFIG.economicIndicators.text.fontSize.pc

    textContainer.append('div')
        .style('font-weight', 'bold')
        .style('font-size', `${fontConfig.indicatorName}px`)
        .style('color', CONFIG.ui.colors.text.accent)
        .style('margin-bottom', '4px')
        .style('line-height', '1.3')
        .text(displayName)

    // 지표값
    textContainer.append('div')
        .style('font-size', `${fontConfig.value}px`)
        .style('color', CONFIG.ui.colors.text.primary)
        .style('font-weight', 'bold')
        .style('margin-bottom', '2px')
        .html(`${indicator.value}`)

    // 날짜
    if (indicator.date) {
        textContainer.append('div')
            .style('font-size', `${fontConfig.date}px`)
            .style('color', CONFIG.ui.colors.text.muted)
            .text(indicator.date)
    }
}

// 스타일링 및 계산 함수들
const func = {
    getColor(change) {
        const colors = CONFIG.stocks.colors.performance
        const isMobileOrTablet = isMobileOrTabletDevice()

        // 색상 진함 조정 함수
        const adjustColor = (color) => {
            if (!isMobileOrTablet) return color

            // hex 색상을 RGB로 변환
            const r = parseInt(color.slice(1, 3), 16)
            const g = parseInt(color.slice(3, 5), 16)
            const b = parseInt(color.slice(5, 7), 16)

            // RGB 값을 조정 (강한 변화일 때는 1.5배, 약한 변화일 때는 1.2배)
            const darken = (value) => {
                const multiplier = (Math.abs(change) > 3) ? CONFIG.stocks.colors.intensity.mobile.strongMultiplier : CONFIG.stocks.colors.intensity.mobile.normalMultiplier
                return Math.min(255, Math.floor(value * multiplier))
            }

            // 진한 색상으로 변환
            const newR = darken(r)
            const newG = darken(g)
            const newB = darken(b)

            // RGB를 hex로 변환
            return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`
        }

        if (change > 3) return adjustColor(colors.strongUp)
        if (change > 2) return adjustColor(colors.up3)
        if (change > 1) return adjustColor(colors.up2)
        if (change > 0) return adjustColor(colors.up1)
        if (change === 0 || !change) return adjustColor(colors.neutral)
        if (change < -3) return adjustColor(colors.strongDown)
        if (change < -2) return adjustColor(colors.down3)
        if (change < -1) return adjustColor(colors.down2)
        return adjustColor(colors.down1)
    },

    calcName(d) {
        const boxArea = (d.x1 - d.x0) * (d.y1 - d.y0)
        const boxWidth = d.x1 - d.x0
        const boxHeight = d.y1 - d.y0
        const aspectRatio = boxWidth / boxHeight

        // 기본 크기 계산 (박스 면적 기반)
        let size = Math.sqrt(boxArea) / 13

        // 모바일/패드 환경에서 가로세로 비율에 따른 조정
        if (isMobileOrTabletDevice()) {
            const isTablet = window.innerWidth >= CONFIG.system.screen.devices.tablet.minWidth &&
                window.innerWidth <= CONFIG.system.screen.devices.tablet.maxWidth

            if (isTablet) {
                // 패드 환경에서는 기본 크기를 더 작게 조정
                size *= CONFIG.stocks.box.textSize.aspectRatio.baseMultiplier.tablet.name

                // 가로세로 비율에 따른 추가 조정
                if (aspectRatio > CONFIG.stocks.box.textSize.aspectRatio.wide.threshold) {
                    size *= CONFIG.stocks.box.textSize.aspectRatio.wide.multiplier.tablet  // 가로가 더 길면 약간 더 작게
                } else if (aspectRatio < CONFIG.stocks.box.textSize.aspectRatio.tall.threshold) {
                    size *= CONFIG.stocks.box.textSize.aspectRatio.tall.multiplier.tablet  // 세로가 더 길면 더 작게
                }
            } else {
                // 모바일 환경에서는 기존 로직 유지
                if (aspectRatio > CONFIG.stocks.box.textSize.aspectRatio.wide.threshold) {
                    size *= CONFIG.stocks.box.textSize.aspectRatio.wide.multiplier.mobile
                } else if (aspectRatio < CONFIG.stocks.box.textSize.aspectRatio.tall.threshold) {
                    size *= CONFIG.stocks.box.textSize.aspectRatio.tall.multiplier.mobile
                }
            }
        }

        // 환경별 설정 적용 (기본 범위 제한용)
        let config
        if (isMobile()) {
            config = CONFIG.stocks.box.textSize.name.mobile
        } else if (window.innerWidth >= CONFIG.system.screen.devices.tablet.minWidth &&
            window.innerWidth <= CONFIG.system.screen.devices.tablet.maxWidth) {
            config = CONFIG.stocks.box.textSize.name.tablet
        } else {
            config = CONFIG.stocks.box.textSize.name.pc
        }

        // 최종 크기 제한 (너무 크거나 작지 않도록)
        size = Math.min(config.max, Math.max(config.min, size))
        return { size }
    },

    calcChange(d) {
        const boxArea = (d.x1 - d.x0) * (d.y1 - d.y0)
        const boxWidth = d.x1 - d.x0
        const boxHeight = d.y1 - d.y0
        const aspectRatio = boxWidth / boxHeight

        // 기본 크기 계산 (박스 면적 기반)
        let size = Math.sqrt(boxArea) / 30

        // 모바일/패드 환경에서 가로세로 비율에 따른 조정
        if (isMobileOrTabletDevice()) {
            const isTablet = window.innerWidth >= CONFIG.system.screen.devices.tablet.minWidth &&
                window.innerWidth <= CONFIG.system.screen.devices.tablet.maxWidth

            if (isTablet) {
                // 패드 환경에서는 기본 크기를 더 작게 조정
                size *= CONFIG.stocks.box.textSize.aspectRatio.baseMultiplier.tablet.change

                // 가로세로 비율에 따른 추가 조정
                if (aspectRatio > CONFIG.stocks.box.textSize.aspectRatio.wide.threshold) {
                    size *= CONFIG.stocks.box.textSize.aspectRatio.wide.multiplier.tablet  // 가로가 더 길면 약간 더 작게
                } else if (aspectRatio < CONFIG.stocks.box.textSize.aspectRatio.tall.threshold) {
                    size *= CONFIG.stocks.box.textSize.aspectRatio.tall.multiplier.tablet  // 세로가 더 길면 더 작게
                }
            } else {
                // 모바일 환경에서는 기존 로직 유지
                if (aspectRatio > CONFIG.stocks.box.textSize.aspectRatio.wide.threshold) {
                    size *= CONFIG.stocks.box.textSize.aspectRatio.wide.multiplier.mobile
                } else if (aspectRatio < CONFIG.stocks.box.textSize.aspectRatio.tall.threshold) {
                    size *= CONFIG.stocks.box.textSize.aspectRatio.tall.multiplier.mobile
                }
            }
        }

        // 환경별 설정 적용 (기본 범위 제한용)
        let config
        if (isMobile()) {
            config = CONFIG.stocks.box.textSize.change.mobile
        } else if (window.innerWidth >= CONFIG.system.screen.devices.tablet.minWidth &&
            window.innerWidth <= CONFIG.system.screen.devices.tablet.maxWidth) {
            config = CONFIG.stocks.box.textSize.change.tablet
        } else {
            config = CONFIG.stocks.box.textSize.change.pc
        }

        // 최종 크기 제한 (너무 크거나 작지 않도록)
        size = Math.min(config.max, Math.max(config.min, size))
        return { size }
    }
}

function createTreemap({ isFetch = false }) {
    // 컨테이너 존재 여부 체크
    if (!treemapContainer.value) {
        console.warn('Treemap container not ready')
        return
    }

    // 화면 크기에 따른 width 계산
    const indicatorAreaWidth = economicIndicators.value.length > 0 ?
        (isMobile() ?
            CONFIG.economicIndicators.layout.area.areaWidth.mobile :
            (window.innerWidth >= CONFIG.system.screen.devices.largePc.minWidth ?
                CONFIG.economicIndicators.layout.area.areaWidth.largePC :
                CONFIG.economicIndicators.layout.area.areaWidth.pc)) + CONFIG.economicIndicators.layout.area.gap : 0

    let width = treemapContainer.value.getBoundingClientRect().width
    const isTablet = window.innerWidth >= CONFIG.system.screen.devices.tablet.minWidth &&
        window.innerWidth <= CONFIG.system.screen.devices.tablet.maxWidth

    if (isTablet) {
        // 태블릿 환경
        width = window.innerWidth * CONFIG.system.screen.devices.tablet.widthMultiplier - indicatorAreaWidth
    } else if (window.innerWidth >= CONFIG.system.screen.devices.pc.minWidth &&
        window.innerWidth <= CONFIG.system.screen.devices.pc.maxWidth) {
        // 일반 PC
        width = window.innerWidth * CONFIG.system.screen.devices.pc.widthMultiplier - indicatorAreaWidth
    } else if (window.innerWidth >= CONFIG.system.screen.devices.largePc.minWidth && !isMobile()) {
        // 대형 PC
        width = window.innerWidth * CONFIG.system.screen.devices.largePc.widthMultiplier - indicatorAreaWidth
    } else if (!isMobile()) {
        // 기타 PC 환경
        width = width - indicatorAreaWidth
    }

    if (isMobile()) {
        // 모바일 환경
        width = window.innerWidth * CONFIG.system.screen.devices.mobile.widthMultiplier - 10
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
        normalizedMarketCap: Math.max((item.marketCap / totalMarketCap) * CONFIG.system.data.normalizationBase, CONFIG.system.data.minNormalizedValue)
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
        const marketCapRatio = sectorMarketCap / CONFIG.system.data.normalizationBase

        // 섹터 크기 등급 결정 (1: 소형, 2: 중형, 3: 대형)
        let sizeClass = 1
        if (marketCapRatio >= CONFIG.stocks.sectors.types.large.minMarketCapRatio || stockCount >= CONFIG.stocks.sectors.types.large.minStockCount) {
            sizeClass = 3  // 대형
        } else if (marketCapRatio >= CONFIG.stocks.sectors.types.medium.minMarketCapRatio || stockCount >= CONFIG.stocks.sectors.types.medium.minStockCount) {
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
    const device = isMobile() ? 'mobile' : (isTablet ? 'tablet' : 'pc')
    const gridConfig = {
        cols: CONFIG.stocks.layout.grid.cols[device],
        gap: CONFIG.stocks.layout.grid.gap[device],
        baseWidth: (width - (CONFIG.stocks.layout.grid.gap[device] * (CONFIG.stocks.layout.grid.cols[device] - 1))) / CONFIG.stocks.layout.grid.cols[device],
        baseHeight: CONFIG.stocks.layout.grid.baseHeight[device]
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
    const totalHeight = maxColumnHeight + CONFIG.stocks.layout.svg.bottomPadding // CONFIG화된 하단 여백

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
        const headerHeight = isMobile() ? CONFIG.stocks.sectors.header.height.mobile : CONFIG.stocks.sectors.header.height.pc
        const fontSize = isMobile()
            ? (sizeClass === 3 ? CONFIG.stocks.sectors.header.fontSize.mobile.large : CONFIG.stocks.sectors.header.fontSize.mobile.medium)
            : (sizeClass === 3 ? CONFIG.stocks.sectors.header.fontSize.pc.large : CONFIG.stocks.sectors.header.fontSize.pc.medium)

        // 섹터 헤더
        svg.append('rect')
            .attr('x', x)
            .attr('y', actualY)
            .attr('width', width)
            .attr('height', headerHeight)
            .attr('fill', CONFIG.ui.colors.background.sectorHeader)
            .attr('rx', CONFIG.ui.colors.border.radius)
            .attr('ry', CONFIG.ui.colors.border.radius)

        svg.append('foreignObject')
            .attr('x', x + CONFIG.stocks.sectors.header.padding[isMobile() ? 'mobile' : 'pc'])
            .attr('y', actualY + 8)
            .attr('width', width - (CONFIG.stocks.sectors.header.padding[isMobile() ? 'mobile' : 'pc'] * 2))
            .attr('height', headerHeight - 16)
            .append('xhtml:div')
            .attr('class', 'sector-header')
            .style('font-size', fontSize)
            .style('font-weight', 'bold')
            .style('color', CONFIG.ui.colors.text.primary)
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
        const padding = isMobile() ? 8 : CONFIG.stocks.box.spacing.padding.pc  // PC는 CONFIG 값 사용 (8px)

        // 현재 섹터 주식들의 트리맵 생성
        if (sectorStocks.length > 0) {
            const root = d3.hierarchy({ children: sectorStocks })
                .sum(d => d.normalizedMarketCap)
                .sort((a, b) => b.value - a.value)

            d3.treemap()
                .size([width + CONFIG.stocks.layout.treemap.widthAdjustment, treemapHeight])
                .padding(padding)(root)

            // 사용된 영역 계산
            const usedArea = root.leaves().reduce((total, d) => {
                return total + (d.x1 - d.x0) * (d.y1 - d.y0)
            }, 0)

            const totalArea = width * treemapHeight
            const utilization = usedArea / totalArea

            // 공간 활용도가 70% 미만이면 다른 섹터 주식으로 빈 공간 채우기
            if (utilization < CONFIG.system.data.spaceUtilizationThreshold) {
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
                    Math.floor(otherSectorStocks.length * emptySpaceRatio * CONFIG.system.data.additionalStockRatio),
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
                    .size([width + CONFIG.stocks.layout.treemap.widthAdjustment, treemapHeight])
                    .padding(padding)(combinedRoot)

                // 통합 트리맵 노드 생성
                createTreemapNodes(
                    svg,
                    combinedRoot,
                    `treemap-node-${index}`,
                    d => `translate(${x + d.x0 - CONFIG.stocks.layout.treemap.positionAdjustment}, ${actualY + headerHeight + d.y0})`,
                    isFetch
                )
            } else {
                // 공간 활용도가 충분하면 기존 섹터 주식만 표시
                createTreemapNodes(
                    svg,
                    root,
                    `treemap-node-${index}`,
                    d => `translate(${x + d.x0 - CONFIG.stocks.layout.treemap.positionAdjustment}, ${actualY + headerHeight + d.y0})`,
                    isFetch
                )
            }
        }
    })
}

const fetchEconomicIndicators = async () => {
    // 이미 가져왔으면 다시 가져오지 않음
    if (hasEconomicIndicatorsFetched.value) {
        console.log('[INFO] Economic indicators already fetched, skipping')
        return
    }

    try {
        console.log('[INFO] Fetching economic indicators (first time)')
        const { data } = await useFetch('/api/economic-indicators', {
            retry: false,
        })
        if (data.value) {
            economicIndicators.value = data.value
            hasEconomicIndicatorsFetched.value = true // 성공 시 플래그 설정
            console.log('[INFO] Economic indicators fetched successfully')

            // 경제지표가 로드되면 트리맵 업데이트
            if (treemapContainer.value) {
                createTreemap({ isFetch: true })
            }
        } else {
            console.warn('No economic indicators data received')
        }
    } catch (error) {
        console.error('Failed to fetch economic indicators:', error)
        // 실패 시에는 플래그를 설정하지 않아서 다음에 다시 시도할 수 있게 함
    }
}

const fetch = async () => {
    let retryCount = 0
    const maxRetries = 3

    const fetchStocks = async () => {
        try {
            console.log('[C1] Fetching stocks data')
            const { data } = await useFetch('/api/stocks', {
                retry: false,
            })

            if (!data.value) {
                if (retryCount < maxRetries) {
                    retryCount++
                    console.warn(`[C2] Retrying stocks fetch (attempt ${retryCount}/${maxRetries})`)
                    return setTimeout(() => fetchStocks(), CONFIG.system.timing.retryDelay)
                }
                console.error(`[C3] Failed to fetch stocks after ${maxRetries} attempts`)
                return
            }

            retryCount = 0 // 성공하면 재시도 카운트 리셋

            // 전체 데이터 업데이트
            if (data.value.data) {
                console.log(`[C4] Received ${data.value.data.length} stocks`)
                items.value = data.value.data
            }

            // 업데이트 상태 정보 저장
            if (data.value.updateStatus) {
                marketClosedUpdateStatus.value.hasCompletedInitialUpdate = data.value.updateStatus.hasCompletedInitialUpdate
                marketClosedUpdateStatus.value.isBackgroundUpdateInProgress = data.value.updateStatus.isBackgroundUpdateInProgress
            }

            // 트리맵 업데이트
            if (treemapContainer.value) {
                createTreemap({ isFetch: true })
            } else {
                setTimeout(() => createTreemap({ isFetch: true }), CONFIG.system.timing.containerReadyDelay)
            }

        } catch (error) {
            console.error(`[C5] Failed to fetch stocks:`, error)
            if (retryCount < maxRetries) {
                retryCount++
                console.warn(`[C6] Retrying stocks fetch after error (attempt ${retryCount}/${maxRetries})`)
                setTimeout(() => fetchStocks(), CONFIG.system.timing.retryDelay)
            }
        }
    }

    // 주식 데이터 가져오기
    await fetchStocks()

    // 경제 지표도 함께 가져오기
    await fetchEconomicIndicators()

    const { isMarketOpen } = useMarketOpen()
    if (!isMarketOpen) {
        // 마켓이 닫혀있을 때: 초기 업데이트가 완료되지 않았으면 주기적으로 확인
        if (!marketClosedUpdateStatus.value.hasCompletedInitialUpdate) {
            console.log('[C7] Market closed - checking for update completion')
            setTimeout(fetch, CONFIG.system.timing.firstFetchInterval)
        } else {
            console.log('[C8] Market closed - initial update completed, stopping periodic fetch')
        }
        return
    }

    setTimeout(fetch, CONFIG.system.timing.fetchInterval)
}

onMounted(() => {
    // 컴포넌트가 마운트된 후 약간의 지연을 두고 fetch 시작
    setTimeout(fetch, CONFIG.system.timing.initialFetchDelay)
})
</script>

<style scoped>
/* 한국어 가독성을 위한 폰트 설정 */
* {
    font-family: 'Noto Sans KR', 'Malgun Gothic', 'Apple SD Gothic Neo', 'Nanum Gothic', sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
}

/* SVG 컨테이너 최적화 */
.stocks-area {
    flex: 1;
    min-width: 0;
    position: relative;
    overflow: hidden;
}

.stocks-area svg {
    display: block;
    width: 100%;
    height: auto;
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
    gap: 8px;
    align-items: flex-start;
}

.stocks-area {
    flex: 1;
    min-width: 0;
}

.indicators-area {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
    position: relative;
    min-width: 205px;
}

.economic-indicators-container {
    background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
    border: 2px solid #4FC3F7;
    border-radius: 12px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
    overflow: hidden;
    margin-right: 4px;
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
        gap: 4px;
    }

    .indicators-area {
        width: 100%;
        min-width: unset;
        margin-top: 8px;
    }

    .economic-indicators-container {
        width: 100%;
        min-height: 150px;
    }

    .stocks-area svg text {
        fill: inherit !important;
    }

    .stocks-area svg tspan {
        fill: inherit !important;
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

/* 모바일/패드 환경 최적화 */
@media (max-width: 1024px),
(pointer: coarse) {
    .stocks-area svg {
        -webkit-backface-visibility: hidden;
        backface-visibility: hidden;
        -webkit-perspective: 1000;
        perspective: 1000;
    }

    .stocks-area svg text {
        pointer-events: none;
        user-select: none;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
    }
}
</style>
