require("dotenv").config();

const express = require("express");
const { MongoClient } = require("mongodb");
const fs = require("fs");
const path = require("path");

const coordinatesPath = path.join(__dirname, "resource-coordinates.json");
const resourceCoordinates = JSON.parse(
    fs.readFileSync(coordinatesPath, "utf8")
);

const app = express();
const port = process.env.PORT || 3000;
const client = new MongoClient(process.env.MONGODB_URI);

app.use(express.json());
app.use(express.static(__dirname));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

async function startServer() {
    try {
        await client.connect();
        console.log("Connected to MongoDB Atlas");

        const db = client.db("goodWrenDB");
        const resources = db.collection("foodResources");

        app.get("/api/resources", async (req, res) => {
            try {
                const records = await resources.find({
                    _id: {
                    $in: Object.keys(resourceCoordinates).map(id => new (require("mongodb").ObjectId)(id))
                    }
                }).toArray();
                
                const recordsWithCoordinates = records.map(record => {
                    const coordinates = resourceCoordinates[String(record._id)];

                    if (!coordinates) {
                        return record;
                    }

                    return {
                        ...record,
                        latitude: coordinates.latitude,
                        longitude: coordinates.longitude
                    };
                });

                res.json(recordsWithCoordinates);

            } catch (error) {
                console.error("Error fetching resources", error.message);
                res.status(500).json({ error: "Unable to load food resources" });
            }
        });
        
        app.get("/api/health", (req, res) => {
                res.json({ status: "ok" });
        });

        app.listen(port, () => {
            console.log(`The Good Wren API is running on port ${port}`);
        });
    } catch (error) {
        console.error("Could not connect to MongoDB:", error.message);
        process.exit(1);
    }        
}

startServer();
