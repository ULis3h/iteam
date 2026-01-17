const API_URL = "http://localhost:3000/api";
const API_KEY = "iteam-device-key";
const DEVICE_ID = "8d6e5c3d-6b58-4c00-b0ac-1eb6c8f1d475"; // MacBook Pro

async function runDeviceAgent() {
    console.log("🤖 [Device Agent] Starting up on MacBook Pro...");
    console.log("------------------------------------------------");

    // 1. Heartbeat
    console.log("📡 1. Sending Heartbeat...");
    try {
        const updateRes = await fetch(`${API_URL}/devices/${DEVICE_ID}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': API_KEY
            },
            body: JSON.stringify({
                status: "working",
                role: "frontend",
                metadata: { cpuUsage: 45, memoryUsage: 60 }
            })
        });
        const deviceData = await updateRes.json();
        console.log(`   > Connected as: ${deviceData.name}`);
        console.log(`   > Status: ${deviceData.status}`);

        console.log("\n------------------------------------------------");

        // 2. Sync Config
        console.log("📥 2. Fetching Assigned Role & Config...");
        const role = deviceData.role;
        const skills = JSON.parse(deviceData.skills || '[]');

        console.log(`   > My Assigned Role: \x1b[32m${role}\x1b[0m`);
        console.log(`   > My Assigned Skills: ${skills.join(', ')}`);

        console.log("------------------------------------------------");

        // 3. Pull Prompts
        if (role) {
            console.log("📘 3. Pulling Role Instructions (Prompts)...");
            const roleRes = await fetch(`${API_URL}/roles/${role}`);
            const roleConfig = await roleRes.json();

            if (roleConfig.prompts) {
                console.log(`   > Fetching operating manual for [${roleConfig.name}]...`);
                console.log(`   > \x1b[36m[SYSTEM PROMPT]: ${roleConfig.prompts.systemPrompt.substring(0, 100)}...\x1b[0m`);
            }
        } else {
            console.log("⚠️  No role assigned yet.");
        }

        console.log("------------------------------------------------");
        console.log("✅ Device is synced and ready to work!");

    } catch (error) {
        console.error("Error:", error);
    }
}

runDeviceAgent();
