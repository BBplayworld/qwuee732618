<template>
    <div class="container-treemap">
        <div class="header">
            <h1>Realtime Market Treemap</h1>
            <Copyright />
        </div>
        <div ref="treemapContainer" class="content">
            <InitTreemap />
        </div>
        <div class="bottom">
            <h5 class="description"><span style="color: #0073e6;">ℹ️</span> This application provides a
                real-time view of the market treemap, offering
                insight
                into market trends and performance</h5>
            <div class="data-source">Data provided by <a href="https://finnhub.io" target="_blank">Finnhub</a></div>
        </div>
    </div>
    <PercentageFromHigh :items="items" />
</template>

<script setup>
import { ref, onMounted } from 'vue'
import * as d3 from 'd3'
import { useMarketOpen } from '~/composables/useMarketOpen'

const treemapContainer = ref(null)
const items = ref([])

const fetch = async () => {
    const { data } = await useFetch('/api/stocks', {
        retry: false
    })

    if (!data.value) {
        return setTimeout(fetch, 100)
    }

    items.value = data.value
    createTreemap({ isFetch: true })

    const { isPeekTime, isMarketOpen } = useMarketOpen()

    if (!isMarketOpen) {
        return setTimeout(fetch, 20000)
    }

    if (isPeekTime) {
        setTimeout(fetch, 5000)
    }

    setTimeout(fetch, 10000)
}

onMounted(() => {
    fetch()

    const intervalTreemap = setInterval(() => createTreemap({ isFetch: false }), 3000) // 3초

    // 컴포넌트가 언마운트될 때 interval 정리
    onUnmounted(() => {
        clearInterval(intervalTreemap)
    })
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
    calcName(d) {
        let size = d.value / 25
        if (size < 15) size = 13
        if (size > 15 & size < 50) size = 22
        if (size > 50) size = 32

        if (window.innerWidth < 767 && size >= 32) size = 20
        else if (window.innerWidth < 767 && size >= 22) size = 17
        else if (window.innerWidth < 767 && size >= 13) size = 8

        return {
            size
        }
    },
    calcChange(d) {
        let size = d.value / 30
        if (size < 15) size = 13
        if (size > 15 & size < 30) size = 18
        if (size > 30) size = 20

        if (window.innerWidth < 767 && size >= 20) size = 17
        else if (window.innerWidth < 767 && size >= 18) size = 13
        else if (window.innerWidth < 767 && size >= 13) size = 8

        return {
            size
        }
    },
}

function createTreemap({ isFetch = false }) {
    let width = treemapContainer.value.getBoundingClientRect().width  // 트리맵의 전체 너비
    let height = window.innerWidth < 1279 ? window.innerHeight - 320 : 660 // 트리맵의 전체 높이

    if (window.innerWidth < 1700 && window.innerWidth >= 767) width = window.innerWidth * 0.89
    if (window.innerWidth < 767) width = window.innerWidth - 50

    if (height > 660) height = 660
    if (window.innerWidth < 1279 && height >= 660) height = 470
    if (window.innerWidth < 767) height = 500

    const root = d3.hierarchy({ children: items.value })
        .sum(d => d.marketCap) // marketCap을 기준으로 크기를 결정
        .sort((a, b) => b.value - a.value)

    d3.treemap()
        .size([width, height])
        .padding(1)
        (root)

    const svg = d3.select(treemapContainer.value)
        .html('')
        .append('svg')
        .attr('width', width)
        .attr('height', height)

    const node = svg.selectAll('g')
        .data(root.leaves())
        .enter()
        .append('g')
        .attr('transform', d => `translate(${d.x0},${d.y0})`)

    node.append('rect')
        .attr('width', d => d.x1 - 5 - d.x0)
        .attr('height', d => d.y1 - 5 - d.y0)
        .attr('fill', d => func.getColor(d.data['dp']))
        .attr('stroke', 'white')
        .attr('stroke-width', 2)

    node.append('foreignObject')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', d => d.x1 - 5 - d.x0)
        .attr('height', d => d.y1 - 5 - d.y0)
        .append('xhtml:div')
        .attr('class', 'node-container')
        .style('display', 'flex')
        .style('flex-direction', 'column')
        .style('justify-content', 'center')
        .style('align-items', 'center')
        .style('height', '100%')
        .style('text-align', 'center')
        .html(d => `
            <div class="node-name font-opensans" style="font-size:${func.calcName(d).size}px; word-break: break-word; margin-bottom:2px">
                <strong>${d.data.name}</strong>
            </div>
            <div class="node-change font-roboto" style="font-size:${func.calcChange(d).size}px;line-height:1.1em">
                ${d.data['c']} (${Math.round(d.data['dp'] * 100) / 100}%)</span>
            </div>
        `)

    // 갱신 시 애니메이션
    if (isFetch) {
        node.select('.node-change')
            .transition()  // 트랜지션 시작
            .duration(700) // 700ms 동안 실행
            .ease(d3.easeCubicOut) // 부드러운 애니메이션 적용
            .style('opacity', 0) // 점차 사라짐
            .on('end', function (d) {
                d3.select(this)
                    .text(`${d.data['c']} (${Math.round(d.data['dp'] * 100) / 100}%)`)  // 새 데이터로 업데이트
                    .style('opacity', 0) // 투명 상태
                    .attr('transform', 'translate(0, 10)') // 아래쪽에서 등장
                    .transition()  // 다시 트랜지션 시작
                    .duration(700) // 700ms 동안 실행
                    .ease(d3.easeCubicOut) // 부드러운 애니메이션 적용
                    .attr('transform', 'translate(0, 0)') // 제자리로 돌아옴
                    .style('opacity', 1) // 다시 보여짐
            })

    }
}

</script>

<style scoped>
h1,
h2 {
    color: #F08;
}

.container-treemap {
    min-width: 100%;
    display: block;
    justify-content: left;
    align-items: center;
    margin: 0 0 20px 10px;
    padding: 10px;
}

.header {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 30px;
}

.content {
    margin-right: 15px;
}

.node-container {
    color: #fff;
    word-break: break-word;
    /* 텍스트 줄바꿈 처리 */
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 100%;
    text-align: center;
}

.node-name {
    font-size: 12px;
    /* 기본 폰트 크기, 상황에 따라 조정 가능 */
    font-weight: bold;
    white-space: pre-wrap;
    /* 텍스트 줄바꿈을 유지 */
}

.node-change {
    font-size: 10px;
    /* 기본 폰트 크기, 상황에 따라 조정 가능 */
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

@media (min-width: 768px) and (max-width: 1279px) {
    .bottom {
        margin: 0 30px 10px 0;
    }

    .bottom h5 {
        font-size: 12px;
    }

    .bottom .data-source {
        margin: 5px 0 0 0;
        text-align: right;
    }
}

@media all and (max-width: 767px) {
    .container-treemap {
        padding: 3px;
        margin: 0;
    }

    .bottom {
        margin: 30px 25px 20px 0;
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
</style>