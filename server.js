require("dotenv").config();
const express = require("express");
const fs = require("fs");

const app = express();
app.use(express.json()); // Middleware to parse JSON requests

// ✅ Handle Commerce7 App Install Data
app.post("/install", (req, res) => {
    try {
        console.log("🔄 Received Install Data from Commerce7:", req.body);

        const { tenantId, firstName, lastName, email } = req.body;

        if (!tenantId) {
            return res.status(400).json({ error: "Missing Tenant ID" });
        }

        // Save tenant info to a local file (for now)
        const tenants = JSON.parse(fs.readFileSync("tenants.json", "utf-8") || "[]");
        tenants.push({ tenantId, firstName, lastName, email });
        fs.writeFileSync("tenants.json", JSON.stringify(tenants, null, 2));

        console.log("✅ Tenant Registered:", tenantId);
        res.status(200).json({ message: "Installation successful!" });
    } catch (error) {
        console.error("❌ Error handling install:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// ✅ Start Express Server on Port 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});
