const db = require('./db/pool');
const kpiMktRoute = require('./routes/kpiMarketing');
const Fastify = require('fastify');

async function testGetKpiMkt() {
    console.time("GET_KPI_MKT");
    const app = Fastify();
    
    // Fake authentication middleware
    app.addHook('onRequest', async (req, reply) => {
        req.user = { id: 1, username: 'admin', role: 'giam_doc' };
    });

    await app.register(kpiMktRoute);

    try {
        const response = await app.inject({
            method: 'GET',
            url: '/api/reports/kpi-marketing?month=2026-08'
        });
        console.timeEnd("GET_KPI_MKT");
        console.log("STATUS CODE:", response.statusCode);
        if (response.statusCode !== 200) {
            console.error("BODY:", response.body);
        } else {
            const data = JSON.parse(response.body);
            console.log("SUCCESS! Summary keys:", Object.keys(data.summary || {}));
            console.log("Categories count:", data.categories ? data.categories.length : 0);
            console.log("Handlers count:", data.handlers ? data.handlers.length : 0);
        }
    } catch(e) {
        console.timeEnd("GET_KPI_MKT");
        console.error("Error:", e);
    }
}

testGetKpiMkt();
