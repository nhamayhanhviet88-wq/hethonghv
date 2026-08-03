require('dotenv').config();
const Fastify = require('fastify');
const kpiMktRoute = require('./routes/kpiMarketing');

async function testRegister() {
    const app = Fastify({ logger: true });
    try {
        await app.register(kpiMktRoute);
        await app.ready();
        console.log("REGISTER SUCCESS!");
        console.log("Routes:\n", app.printRoutes());
    } catch(e) {
        console.error("REGISTER ERROR:", e);
    }
}

testRegister();
