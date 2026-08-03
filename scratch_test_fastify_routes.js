const Fastify = require('fastify');
const kpiMktPlugin = require('./routes/kpiMarketing');

async function testFastify() {
    const app = Fastify({ logger: true });
    try {
        await app.register(kpiMktPlugin);
        await app.ready();
        console.log("=== FASTIFY ROUTES ===");
        console.log(app.printRoutes());
    } catch(e) {
        console.error("Fastify plugin registration error:", e);
    }
}

testFastify();
