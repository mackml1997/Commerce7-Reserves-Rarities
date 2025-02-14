require('dotenv').config();
const fetch = require("node-fetch");

const commerce7ApiKey = process.env.COMMERCE_7_API_KEY;

if (!commerce7ApiKey) {
    console.error("🚨 Missing Commerce7 API Key. Add it to Replit Secrets!");
    process.exit(1);
}

console.log("✅ Commerce7 API Key loaded successfully!");

const commerce7BaseUrl = "https://api.commerce7.com/v1";

async function fetchUserProfile() {
    try {
        const requestUrl = `${commerce7BaseUrl}/user`;
        console.log(`🔄 Requesting User Profile: ${requestUrl}`);

        const response = await fetch(requestUrl, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${commerce7ApiKey}`,
                "Content-Type": "application/json"
            }
        });

        console.log(`📡 Response Status: ${response.status} ${response.statusText}`);

        if (!response.ok) {
            throw new Error(`API Request Failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log("✅ User Profile API Response:", JSON.stringify(data, null, 2));
        return data;
    } catch (error) {
        console.error("❌ Error fetching user profile:", error.message);
        return null;
    }
}

module.exports = { fetchUserProfile };
