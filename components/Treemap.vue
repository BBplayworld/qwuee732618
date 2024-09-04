<template>
    <div class="container">
        <div class="header">
            <h1>Market Treemap</h1>
            <div class="copyright">{{ dayjs().format('YYYY-MM-DD') }} © Treastock</div>
        </div>
        <div ref="treemapContainer" class="content"></div>
        <!-- Finhub 데이터 출처 표기 추가 -->
        <div class="data-source">Data provided by <a href="https://finnhub.io" target="_blank">Finnhub</a></div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import * as d3 from 'd3'
import dayjs from 'dayjs'

const treemapContainer = ref(null)
const stocks = ref([])

const fetch = async () => {
    const { data } = await useFetch('/api/stocks', {
        retry: false
    })

    if (!data.value) {
        return setTimeout(fetch, 1000)
    }

    stocks.value = data.value
    createTreemap()
}

onMounted(() => {
    fetch() // 페이지가 로드될 때 최초 데이터 가져오기

    const interval = setInterval(() => {
        fetch()
    }, 65000) // 65,000 밀리초 = 1분5초

    // 컴포넌트가 언마운트될 때 interval 정리
    onUnmounted(() => {
        clearInterval(interval)
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

        if (window.innerWidth < 767 && size <= 22) size = 11.5

        return {
            size
        }
    },
    calcChange(d) {
        let size = d.value / 30
        if (size < 15) size = 13
        if (size > 15 & size < 30) size = 18
        if (size > 30) size = 20

        if (window.innerWidth < 767 && size <= 18) size = 8.5

        return {
            size
        }
    },
}

function createTreemap() {
    let width = window.innerWidth < 1279 ? window.innerWidth - 35 : (window.innerWidth * 0.56);  // 트리맵의 전체 너비
    let height = window.innerWidth < 1279 ? window.innerHeight - 320 : 660; // 트리맵의 전체 높이
    if (width > 1279) width = 1000
    if (height > 660) height = 660
    if (window.innerWidth < 1279 && height >= 660) height = 470
    if (window.innerWidth < 767) height = 500

    const root = d3.hierarchy({ children: stocks.value })
        .sum(d => d.marketCap) // marketCap을 기준으로 크기를 결정
        .sort((a, b) => b.value - a.value);

    d3.treemap()
        .size([width, height])
        .padding(1)
        (root);

    const svg = d3.select(treemapContainer.value)
        .html('')
        .append('svg')
        .attr('width', width)
        .attr('height', height);

    const node = svg.selectAll('g')
        .data(root.leaves())
        .enter()
        .append('g')
        .attr('transform', d => `translate(${d.x0},${d.y0})`);

    const rects = node.append('rect')
        .attr('width', d => d.x1 - 5 - d.x0)
        .attr('height', d => d.y1 - 5 - d.y0)
        .attr('fill', d => func.getColor(d.data['dp']))
        .attr('stroke', '#222');

    // D3 transition을 사용한 애니메이션
    rects.transition()
        .duration(1500) // 애니메이션 지속 시간 (2초)
        .attr('fill', 'rgba(203, 203, 32, 1)') // 일시적 색상 변화
        .transition()
        .duration(1500) // 애니메이션 지속 시간 (2초)
        .attr('fill', d => func.getColor(d.data['dp'])) // 원래 색상으로 복원

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
            <div class="node-name font-opensans" style="font-size:${func.calcName(d).size}px; word-break: break-word;">
                <strong>${d.data.name}</strong>
            </div>
            <div class="node-change font-roboto" style="font-size:${func.calcChange(d).size}px;line-height:1.1em">
                ${d.data['c']} (${Math.round(d.data['dp'] * 100) / 100}%)
            </div>
        `);
}

</script>

<style scoped>
h1,
h2 {
    margin: 5px 20px 20px 20px;
    color: #F08;
}

.container {
    max-width: 60%;
    border-right: 3px solid #ddd;
    display: block;
    justify-content: left;
    align-items: center;
}

.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 0 20px 0 0;
}

.copyright {
    font-size: 14px;
    color: #666;
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
    font-size: 12px;
    color: #666;
    text-align: right;
    margin-top: 10px;
    padding-right: 20px;
}

.data-source a {
    color: #0073e6;
    text-decoration: none;
}

.data-source a:hover {
    text-decoration: underline;
}

/* 중간 크기 화면 (태블릿)에서의 스타일링 */
@media all and (max-width:1279px) {
    .container {
        min-width: 100%;
        border-right: 0;
        margin-bottom: 15px;
    }
}
</style>