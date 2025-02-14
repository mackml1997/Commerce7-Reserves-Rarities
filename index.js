const { fetchUserProfile } = require("./Commerce7API/commerce7Service");

console.log("🚀 Starting Commerce7 API Test...");

fetchUserProfile()
    .then((data) => {
        if (data) {
            console.log("🎯 Successfully fetched user profile:", JSON.stringify(data, null, 2));
        } else {
            console.log("⚠️ No user profile data returned from Commerce7.");
        }
    })
    .catch((error) => {
        console.error("❌ Error calling fetchUserProfile:", error);
    });
