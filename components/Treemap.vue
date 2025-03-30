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
        return setTimeout(fetch, 60000)
    }

    if (isPeekTime) {
        return setTimeout(fetch, 25000)
    }

    setTimeout(fetch, 30000)
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
            size
        }
    },
    calcName(d) {
        let size = d.value / 35

        if (window.innerWidth < 767) size = 14

        return {
            size
        }
    },
    calcChange(d) {
        let size = d.value / 50

        if (window.innerWidth < 767) size = 14

        return {
            size
        }
    },
}

function createTreemap({ isFetch = false }) {
    let width = treemapContainer.value.getBoundingClientRect().width;
    let height = window.innerWidth < 1279 ? window.innerHeight - 320 : 660;

    if (window.innerWidth < 1700 && window.innerWidth >= 767) width = window.innerWidth * 0.89;
    if (window.innerWidth < 767) width = window.innerWidth - 50;
    if (height > 660) height = 660;
    if (window.innerWidth < 1279 && height >= 660) height = 470;
    if (window.innerWidth < 767) height = 500;

    const root = d3.hierarchy({ children: items.value })
        .sum(d => d.marketCap)
        .sort((a, b) => b.value - a.value)

    d3.treemap()
        .size([width, height])
        .padding(1)(root);

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

    node.append('rect')
        .attr('width', d => d.x1 - d.x0)
        .attr('height', d => d.y1 - d.y0)
        .attr('fill', d => func.getColor(d.data['dp']))
        .attr('stroke', 'white')
        .attr('stroke-width', 2);

    node.append('rect')
        .attr('class', 'sector-label')
        .attr('width', d => d.x1 - d.x0)
        .attr('height', 40)
        .attr('fill', '#272727')
        .attr('stroke', 'white');

    // 텍스트 컨테이너의 높이를 동적으로 설정
    const sectorTextContainer = node.append('foreignObject')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', d => d.x1 - d.x0)
        .attr('height', 40)  // 초기 높이 설정
        .append('xhtml:div')
        .style('width', '100%')
        .style('height', '100%')
        .style('display', 'flex')
        .style('justify-content', 'center')
        .style('align-items', 'center');

    sectorTextContainer.append('div')
        .attr('class', 'sector-text')
        .style('font-size', d => `${func.calcSector(d).size}px`)
        .style('font-weight', 'bold')
        .style('word-break', 'break-word')
        .style('white-space', 'normal') // 텍스트 줄 바꿈을 허용
        .style('text-align', 'center')
        .html(d => d.data.sector);

    // 높이를 동적으로 조정하기 위해 텍스트의 높이를 계산
    sectorTextContainer.each(function (d) {
        const div = d3.select(this);
        const sectorTextHeight = div.node().getBoundingClientRect().height;

        // 텍스트가 화면을 넘으면 높이 조정
        d3.select(this)
            .attr('height', sectorTextHeight); // 높이를 텍스트 내용에 맞게 조정
    });

    const foreignObject = node.append('foreignObject')
        .attr('x', 0)
        .attr('y', 20)
        .attr('width', d => d.x1 - d.x0)
        .attr('height', d => d.y1 - 10 - d.y0)
        .append('xhtml:div')
        .attr('class', 'node-container')
        .style('display', 'flex')
        .style('flex-direction', 'column')
        .style('justify-content', 'center')
        .style('align-items', 'center')
        .style('height', '100%')
        .style('text-align', 'center');

    foreignObject.append('div')
        .attr('class', 'node-name')
        .style('font-size', d => `${func.calcName(d).size}px`)
        .style('margin-top', '5px')
        .html(d => `<strong>${d.data.name}</strong>`);

    const nodeChange = foreignObject.append('div')
        .attr('class', 'node-change')
        .style('font-size', d => `${func.calcChange(d).size}px`)
        .style('margin-top', '5px')
        .html(d => `${d.data['c']} (${Math.round(d.data['dp'] * 100) / 100}%)`);

    if (isFetch) {
        nodeChange.each(function (d) {
            const node = d3.select(this);
            const targetValue = d.data['c'];
            let currentValue = targetValue - 5;
            const intervalId = setInterval(() => {
                if (currentValue < targetValue) {
                    currentValue += 0.2;
                    node.html(`${currentValue.toFixed(2)} (${Math.round(d.data['dp'] * 100) / 100}%)`);
                } else {
                    clearInterval(intervalId);
                    node.html(`${targetValue} (${Math.round(d.data['dp'] * 100) / 100}%)`);
                }
            }, 20);
        });
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