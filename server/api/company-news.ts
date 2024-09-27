import { defineEventHandler } from 'h3'
import { $fetch } from 'ohmyfetch'
import dayjs from 'dayjs'
import { kv } from '@vercel/kv'

const DATA_KEY = 'company-news'
const DATA_TTL = 3600

const predefinedNews = [
    {
        "category": "company",
        "datetime": 1727420400,
        "headline": "10 Hypergrowth Blue-Chip Bargain Buys With This Market At Record Highs",
        "id": 130099418,
        "image": "https://static.seekingalpha.com/cdn/s3/uploads/getty_images/1367482914/image_1367482914.jpg?io=getty-c-w1536",
        "related": "NVDA",
        "source": "SeekingAlpha",
        "summary": "Certain growth-like blue-chip stocks can deliver strong returns and dividends. See how these stocks can provide retirement income for the long term.",
        "url": "https://finnhub.io/api/news?id=ab7828b9d736e0bafdee44de7b8fbeeef937e25a863e653702785e0d8f11ffeb"
    },
    {
        "category": "company",
        "datetime": 1727352900,
        "headline": "Voya Large Cap Growth Strategy Q2 2024 Commentary",
        "id": 130075410,
        "image": "https://static.seekingalpha.com/cdn/s3/uploads/getty_images/481466958/image_481466958.jpg?io=getty-c-w1536",
        "related": "AAPL",
        "source": "SeekingAlpha",
        "summary": "For the quarter, the Strategy underperformed its benchmark on a NAV basis due to unfavorable stock selection. Click here for the full commentary.",
        "url": "https://finnhub.io/api/news?id=e5c38244a2b8eb21347bab0720ce8e0c6f229d073b9391085f390923b67bd0ac"
    },
    {
        "category": "company",
        "datetime": 1727340600,
        "headline": "Coherent showcases 1.6T running on Nvidia 5nm DSP: Barclays",
        "id": 130075015,
        "image": "",
        "related": "AVGO",
        "source": "Seeking Alpha",
        "summary": "Looking for stock market analysis and research with proves results? Zacks.com offers in-depth financial research with over 30years of proven results.",
        "url": "https://finnhub.io/api/news?id=b925ead16d7f8c422b3741b3b7a3aae2ccf5ac9fbfc87dbc615ce8d995ac0ca5"
    },
    {
        "category": "company",
        "datetime": 1727341920,
        "headline": "Palantir Stock vs. Amazon Stock: Wall Street Says Buy One and Sell the Other",
        "id": 130070019,
        "image": "https://g.foolcdn.com/editorial/images/791822/bull-and-bear-3.jpg",
        "related": "AMZN",
        "source": "Yahoo",
        "summary": "Wall Street analysts are generally bullish on Amazon and bearish on Palantir.",
        "url": "https://finnhub.io/api/news?id=659b7c565aae68b922a4cb7959870c785d79fe58febbcdf0bb660f44a5cebf27"
    },
    {
        "category": "company",
        "datetime": 1727308864,
        "headline": "ADBE Bronstein, Gewirtz and Grossman, LLC Announces an Investigation into Adobe Inc. and Encourages Investors to Contact the Firm!",
        "id": 130064565,
        "image": "",
        "related": "ADBE",
        "source": "Finnhub",
        "summary": "NEW YORK, Sept. 26, 2024 /PRNewswire/ -- Attorney Advertising -- Bronstein, Gewirtz & Grossman, LLC is investigating potential claims on behalf of purchasers of Adobe Inc. . Investors who purchased...",
        "url": "https://finnhub.io/api/news?id=d0dd2b8efe5e0ee6cc8f2849b780baf2f7802d2b0bcae6d44d61765943fc7522"
    },
    {
        "category": "company",
        "datetime": 1727366760,
        "headline": "ASML Stock Gains 42.4% in a Year: Can its Technology Drive Momentum?",
        "id": 130087836,
        "image": "https://media.zenfs.com/en/zacks.com/76b77267780db8a8e104d16effc1eb76",
        "related": "ASML",
        "source": "Yahoo",
        "summary": "ASML Holding benefits from its growing investments in advanced technologies amid macroeconomic headwinds and stiff competition.",
        "url": "https://finnhub.io/api/news?id=853c3f1272ab496eed547beecabe1ef531bbb65c1f78c0172cd094e123079256"
    },
    {
        "category": "company",
        "datetime": 1727321695,
        "headline": "AMD: A Pullback Is Imminent (Technical Analysis)",
        "id": 130067334,
        "image": "https://media.gettyimages.com/id/AA045492/photo/brown-bear-roaring-side-view.jpg?b=1&s=612x612&w=0&k=20&c=Is1Ib2xLAf5JAMHdS7PtI-adIO4KtN6XH2oXLa7fQ58=",
        "related": "AMD",
        "source": "SeekingAlpha",
        "summary": "AMD declined significantly from its peak set early this year. Check out AMD stock's short-term and intermediate-term analyses and why it is rated as Strong Sell.",
        "url": "https://finnhub.io/api/news?id=3a5e1ee27062af38d9d7816c644904e115831e573d40dc2c68a03ef071483853"
    },
    {
        "category": "company",
        "datetime": 1727344539,
        "headline": "Inside Brian Cornell's plan to get Target back on track",
        "id": 130070016,
        "image": "https://s.yimg.com/ny/api/res/1.2/1YpujWNkVUJPtH5AzaR5Jg--/YXBwaWQ9aGlnaGxhbmRlcjt3PTEyMDA7aD02NzU-/https://s.yimg.com/os/creatr-uploaded-images/2024-09/94ce1250-7abf-11ef-9f77-71364300a604",
        "related": "COST",
        "source": "Yahoo",
        "summary": "Brian Cornell became the first external CEO hire in the history of Target (TGT) when he took the top job in 2014. Ten years in, Cornell has reinvented the company in many ways, experiencing the highs and lows of competing against other major retail giants like Walmart (WMT), Amazon (AMZN), and Costco (COST). To get an inside look at the veteran CEO’s journey and his plans for the future, Yahoo Finance Executive Editor Brian Sozzi sat down with Cornell at a Target store in Jersey City, NJ. The two also met at a park that played a major role in Cornell’s upbringing in Queens, NY to explore what shaped him into the leader he is today. “If you grow up the way I did, you always feel like the underdog,” says Cornell. This mindset helped Cornell rise the retail ranks. He has served in executive roles at major companies like Safeway and Sam’s Club before running Target. Cornell took over when the retailer was struggling and coming off of a data breach. The CEO’s first big move was to exit Canada, after the company’s $5.4 billion venture north of the border failed to take off. In 2017 Cornell announced the $550 million acquisition of delivery company Shipt and a $7 billion investment in Target stores, at a time when the industry appeared to be shifting away from brick-and-mortar. These decisions paid off during the pandemic, when Target’s revenue shot up past $100 billion for the first time in 2021. Recently, Target has missed the mark compared to competitors, with comparable sales falling for four straight quarters through the first quarter of 2024. Target’s declining numbers were due to a number of factors, including retail theft, a backlash to Pride merchandise in 2023, and excess inventory resulting in price cuts, with the main driver being a slowdown in discretionary spending by consumers. Nearly 50% of Target’s product portfolio is made up of non-essentials—much higher than many competitors. To drive growth into the future, Cornell and Target are mixing strategies old and new. The company plans to invest in 300 stores over the next decade, continuing a trend under Cornell. In April of 2024 Target announced a paid membership program, Target Circle 360, to compete with Amazon Prime and Walmart+. The most recent numbers showed positive signs for the retailer, with sales up 2.7% year-over-year in the second quarter of 2024. Target is set to report third quarter earnings on November 20, where the company expects to see more growth, albeit at a slower rate. For more of our Lead This Way series, click here, and tune in to Yahoo Finance Live for more expert insight and the latest market action, Monday through Friday. Editor's note: This article was written by Luke Brooks.",
        "url": "https://finnhub.io/api/news?id=70ca8b960dc840b668d6eb531b326b45a64f3772756ba303dc12eb0e986abb23"
    },
    {
        "category": "company",
        "datetime": 1727368404,
        "headline": "AAII Sentiment Survey: Neutral Sentiment Ticks Up",
        "id": 130083250,
        "image": "https://static.seekingalpha.com/cdn/s3/uploads/getty_images/1365097518/image_1365097518.jpg?io=getty-c-w1536",
        "related": "VOO",
        "source": "SeekingAlpha",
        "summary": "Analyzing recent changes in bullish, neutral, and bearish sentiment in the market among investors. Click here to read my most recent analysis and survey.",
        "url": "https://finnhub.io/api/news?id=0d49b26863690fa0887e77a3311fdd250d0de24688f9ee874433ff0592705861"
    },
    {
        "category": "company",
        "datetime": 1727365600,
        "headline": "A Checkup On The Screws Holding The Economy Together",
        "id": 130081865,
        "image": "https://static.seekingalpha.com/cdn/s3/uploads/getty_images/896029122/image_896029122.jpg?io=getty-c-w1536",
        "related": "QQQ",
        "source": "SeekingAlpha",
        "summary": "Key metrics show robust economic conditions, despite some loose indicators. See more about how GDP growth and employment trends support market stability.",
        "url": "https://finnhub.io/api/news?id=ec053203facee792ab089648fce035dbd53ee154ca8b0cf85ccdd9803046d7ff"
    },
    {
        "category": "company",
        "datetime": 1727348700,
        "headline": "Qualcomm, Broadcom, Marvell Stocks Rise. The AI Run Gets Boost After Micron’s Strong Outlook.",
        "id": 130072114,
        "image": "",
        "related": "QCOM",
        "source": "Yahoo",
        "summary": "Chip stocks were rising early Thursday after the outlook from memory chip maker  Micron Technology  had investors excited.  The  exchange-traded fund was up 3%.  Micron makes up about 3.1% of the ETF’s overall portfolio.",
        "url": "https://finnhub.io/api/news?id=92e0f26d3c8fbfec36361e9a7761c897e888a83a903cc6cbf751fd2e2c5c2c60"
    },
    {
        "category": "company",
        "datetime": 1727384400,
        "headline": "2025 Lucid Air Sapphire: Eat My Dust, Tesla",
        "id": 130087475,
        "image": "https://s.yimg.com/ny/api/res/1.2/RQj6LAKPCsyKUOdF30RfDw--/YXBwaWQ9aGlnaGxhbmRlcjt3PTEyMDA7aD02MDA-/https://media.zenfs.com/en/wsj.com/33e7e886a2143f048d48b040af9e4aa0",
        "related": "TSLA",
        "source": "Yahoo",
        "summary": "Lucid has nosed out the Tesla Model S Plaid for the quickest production sedan on the planet—and Dan Neil calls it a ‘modern design masterpiece.’",
        "url": "https://finnhub.io/api/news?id=b400544a961824f3e5141bdec325dfad7e8e7d624beef4ebac1ba32f1ea9abe4"
    },
    {
        "category": "company",
        "datetime": 1727370961,
        "headline": "OpenAI Discusses 7% Stake for Altman in For-Profit Shift",
        "id": 130084187,
        "image": "",
        "related": "MSFT",
        "source": "Finnhub",
        "summary": "-- OpenAI is discussing giving Chief Executive Officer Sam Altman a 7% equity stake in the company and restructuring to become a for-profit business, people familiar with the matter said, a major...",
        "url": "https://finnhub.io/api/news?id=7cda1fbe28f33bf7d494b2b5d36739d3a7384e24dc18d2e9a796104f2e893917"
    },
    {
        "category": "company",
        "datetime": 1727425948,
        "headline": "AstraZeneca’s Tagrisso gains FDA approval for stage III NSCLC",
        "id": 130098934,
        "image": "https://www.pharmaceutical-technology.com/wp-content/uploads/sites/24/2024/09/Astrazeneca-US.jpg",
        "related": "AZN",
        "source": "Yahoo",
        "summary": "Tagrisso, which targets exon 19 deletions or exon 21 (L858R) mutations, received the approval following a priority review.",
        "url": "https://finnhub.io/api/news?id=ade29c0f086905120fb83337f9333092273995866ba33c07a84cf9f7dc03350a"
    },
    {
        "category": "company",
        "datetime": 1727334360,
        "headline": "Google's NotebookLM adds audio and YouTube support, create study guides",
        "id": 130090497,
        "image": "",
        "related": "GOOG",
        "source": "Thefly.com",
        "summary": "Looking for stock market analysis and research with proves results? Zacks.com offers in-depth financial research with over 30years of proven results.",
        "url": "https://finnhub.io/api/news?id=492f034298171ec93c37b921df275abe8beb1bb759e34f368dd2f59d4fe49687"
    },
    {
        "category": "company",
        "datetime": 1727341300,
        "headline": "Meta: The Bull Charge Is Only Starting  (Technical Analysis)",
        "id": 130072527,
        "image": "https://static.seekingalpha.com/cdn/s3/uploads/getty_images/2154163889/image_2154163889.jpg?io=getty-c-w1536",
        "related": "META",
        "source": "SeekingAlpha",
        "summary": "Investors who followed my Meta $127 buy call from January 2023 will be doing very nicely indeed seeing a near 350% increase. Explore more details here.",
        "url": "https://finnhub.io/api/news?id=db0903af336316a952eb11d14b8ac07833d2756e46571db9cd707d75d834c457"
    }
]

export default defineEventHandler(async () => {
    if (process.env.NODE_ENV !== 'production') {
        return predefinedNews
    }

    let stockCache: Array<Array<any>> = []
    try {
        stockCache = await kv.get(DATA_KEY) as Array<Array<any>>
    } catch (e) { }

    if (stockCache?.length > 0) {
        stockCache = stockCache.filter(item => (item.length > 0))
        return stockCache.map((result) => {
            let ranIdx = Math.floor(Math.random() * result.length)
            return result[ranIdx]
        });
    }

    const symbols = [
        { name: 'QQQ', marketCap: 3000 },
        { name: 'VOO', marketCap: 3000 },
        { name: 'AAPL', marketCap: 3448 },
        { name: 'NVDA', marketCap: 3182 },
        { name: 'MSFT', marketCap: 3098 },
        { name: 'GOOG', marketCap: 2061 },
        { name: 'AMZN', marketCap: 1858 },
        { name: 'META', marketCap: 1335 },
        { name: 'AVGO', marketCap: 774 },
        { name: 'TSLA', marketCap: 703 },
        { name: 'COST', marketCap: 389 },
        { name: 'ASML', marketCap: 356 },
        { name: 'NFLX', marketCap: 294 },
        { name: 'AZN', marketCap: 268 },
        { name: 'AMD', marketCap: 250 },
        { name: 'ADBE', marketCap: 247 },
        { name: 'QCOM', marketCap: 193 },
    ]

    let from = dayjs().add(-1, 'day').format('YYYY-MM-DD')
    let to = dayjs().format('YYYY-MM-DD')

    const requests = symbols.map(async (symbol) => {
        const url = `https://finnhub.io/api/v1/company-news?symbol=${symbol['name']}&from=${from}&to=${to}`

        try {
            const response = await $fetch(url, {
                headers: {
                    'X-Finnhub-Token': process.env.FINN_4_KEY,
                    'Content-Type': 'application/json',
                    'Accept-Charset': 'utf-8',
                }
            });

            return response
        } catch (e) {
            return {}
        }
    })

    let results = await Promise.all(requests)
    results = results.filter(item => (item.length > 0))

    await kv.set(DATA_KEY, JSON.stringify(results), { ex: DATA_TTL })
    return results.map((result) => {
        let ranIdx = Math.floor(Math.random() * result.length)
        return result[ranIdx]
    });
})
