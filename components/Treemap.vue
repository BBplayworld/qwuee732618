<template>
    <div class="container">
        <h1>Nasdaq 100 Treemap</h1>
        <div ref="treemapContainer"></div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import * as d3 from 'd3'

const treemapContainer = ref(null)
const props = defineProps({
    stocks: {
        type: Array,
        required: true
    }
})

const stocks = ref([])

const fetch = async () => {
    const { data } = await useFetch('/api/stocks')
    if (!data.value) {
        return fetch()
    }

    stocks.value = data.value
    createTreemap()
}

onMounted(() => {
    fetch() // 페이지가 로드될 때 최초 데이터 가져오기

    // 1분마다 데이터 갱신
    const interval = setInterval(() => {
        fetch()
    }, 60000) // 60,000 밀리초 = 1분

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
        let isX = (d.x1 - d.x0) > (d.y1 - d.y0)
        return {
            x: 20,
            y: 50,
            size: isX ? (d.x1 - d.x0) / 7 : (d.y1 - d.y0) / 10
        }
    },
    calcChange(d) {
        let isX = (d.x1 - d.x0) > (d.y1 - d.y0)
        return {
            x: 23,
            y: 65,
            size: isX ? (d.x1 - d.x0) / 11 : (d.y1 - d.y0) / 10
        }
    },
}

function createTreemap() {
    const width = 900;  // 트리맵의 전체 너비
    const height = 700; // 트리맵의 전체 높이

    const root = d3.hierarchy({ children: stocks.value })
        .sum(d => d.marketCap) // marketCap을 기준으로 크기를 결정
        .sort((a, b) => b.value - a.value);

    d3.treemap()
        .size([width, height])
        .padding(1)
        (root);

    const svg = d3.select(treemapContainer.value)
        .html('')  // 기존 내용을 지우고 새로 추가
        .append('svg')
        .attr('width', width)
        .attr('height', height);

    const node = svg.selectAll('g')
        .data(root.leaves())
        .enter()
        .append('g')
        .attr('transform', d => `translate(${d.x0},${d.y0})`);

    node.append('rect')
        .attr('width', d => d.x1 - d.x0)
        .attr('height', d => d.y1 - d.y0)
        .attr('fill', d => func.getColor(d.data.change))
        .attr('stroke', '#222');

    node.append('foreignObject')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', d => d.x1 - d.x0)
        .attr('height', d => d.y1 - d.y0)
        .append('xhtml:div')
        .attr('class', 'node-container')
        .style('display', 'flex')
        .style('flex-direction', 'column')
        .style('justify-content', 'center')
        .style('align-items', 'center')
        .style('height', '100%')
        .style('text-align', 'center')
        .html(d => `
            <div class="node-name" style="font-size:${func.calcName(d).size}px; word-break: break-word;">
                <strong>${d.data.name}</strong>
            </div>
            <div class="node-change" style="font-size:${func.calcChange(d).size}px;">
                ${d.data.change}%
            </div>
        `);
}

</script>

<style scoped>
h1,
h2 {
    margin: 20px;
}

.container {
    border: 2px solid #ddd;
    display: block;
    justify-content: left;
    align-items: center;
    margin: 5px;
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
</style>
