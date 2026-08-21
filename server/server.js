require("dotenv").config();

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { GoogleGenAI } = require("@google/genai");

const app = express();

app.use(cors());

const upload = multer({
    storage: multer.memoryStorage()
});

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

app.get("/", (req, res) => {
    res.send("FIND AI server is running.");
});

app.post("/analyze", upload.single("image"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                error: "No image uploaded."
            });
        }

        const base64Image = req.file.buffer.toString("base64");

        const response = await ai.models.generateContent({
            model: "gemini-3.6-flash",

            contents: [
                {
                    inlineData: {
                        mimeType: req.file.mimetype,
                        data: base64Image
                    }
                },
                {
                    text: `
Analyze this fashion image for FIND.

Identify every clearly visible fashion item that a user could reasonably want to find online.

Examples:
- jacket
- blazer
- hoodie
- shirt
- t-shirt
- pants
- jeans
- skirt
- dress
- shoes
- sneakers
- bag
- hat
- sunglasses
- tie
- accessories

Only identify items that are actually visible.

For each item provide:

1. name
2. short visual description
3. bounding box

The bounding box must tightly surround the visible item.

Use normalized coordinates from 0 to 1000.

Coordinate system:
- (0,0) = top-left of image
- (1000,1000) = bottom-right of image
- x = left edge
- y = top edge
- width = box width
- height = box height

Only include clearly visible fashion items.

Do NOT:
- invent items
- include body parts as fashion items
- include the background
- include objects that are not wearable fashion items

If items overlap, give each item its own best bounding box.

Return the result using the required JSON schema.
`
                }
            ],

            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "object",
                    properties: {
                        items: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    name: {
                                        type: "string"
                                    },
                                    description: {
                                        type: "string"
                                    },
                                    box: {
                                        type: "object",
                                        properties: {
                                            x: {
                                                type: "number"
                                            },
                                            y: {
                                                type: "number"
                                            },
                                            width: {
                                                type: "number"
                                            },
                                            height: {
                                                type: "number"
                                            }
                                        },
                                        required: [
                                            "x",
                                            "y",
                                            "width",
                                            "height"
                                        ]
                                    }
                                },
                                required: [
                                    "name",
                                    "description",
                                    "box"
                                ]
                            }
                        }
                    },
                    required: ["items"]
                }
            }
        });

        const text = response.text;

        console.log("GEMINI RESPONSE:", text);

        let result;

        try {
            result = JSON.parse(text);
        } catch (parseError) {
            console.error("JSON PARSE ERROR:", parseError);

            return res.status(500).json({
                error: "Gemini returned invalid JSON."
            });
        }

        res.json({
            result: result
        });

    } catch (error) {
        console.error("FULL GEMINI ERROR:", error);

        res.status(500).json({
            error: error.message || "AI analysis failed."
        });
    }
});

app.listen(3000, () => {
    console.log("FIND AI server running on http://localhost:3000");
});