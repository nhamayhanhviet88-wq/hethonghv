require('dotenv').config();
const jwt = require('jsonwebtoken');
const db = require('./db/pool');

async function main() {
    try {
        await db.init();
        
        // Find Giám đốc user
        const user = await db.get("SELECT id, role, token_version FROM users WHERE role = 'giam_doc' LIMIT 1");
        if (!user) {
            console.error("No giam_doc user found!");
            return;
        }
        
        console.log("Found giam_doc user:", user);
        
        // Generate JWT token
        const token = jwt.sign(
            { id: user.id, role: user.role, tv: user.token_version },
            process.env.JWT_SECRET
        );
        
        console.log("Generated token:", token);
        
        // Call the API
        console.log("Calling resend-design-email API...");
        const res = await fetch("http://localhost:11000/api/dht/orders/142/resend-design-email", {
            method: "POST",
            headers: {
                "Cookie": `token=${token}`
            }
        });
        
        console.log("Response status:", res.status);
        const json = await res.json();
        console.log("Response JSON:", json);
        
    } catch(err) {
        console.error("ERROR:", err);
    } finally {
        await db.close();
    }
}

main();
