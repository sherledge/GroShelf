const express = require("express");
const multer = require("multer");
const Tesseract = require("tesseract.js");
const fs = require("fs");
const { supabase } = require("../db");
const Joi = require("joi");
const router = express.Router();
const { GroceryCategory } = require("../enum/enums");

let synonymMap = {};
async function loadSynonymsFromSupabase() {
    try {
        const { data, error } = await supabase.from("grocery_items").select("*");

        if (error) throw error;
        console.log("✅ Synonyms fetched from Supabase:", data); // Debug log

        if (!data || data.length === 0) {
            console.warn("⚠️ No synonyms found in Supabase.");
            return;
        }

        synonymMap = data.reduce((map, row) => {
            if (Array.isArray(row.synonyms) && row.common_name) {
                row.synonyms.forEach((syn) => {
                    if (typeof syn === "string") {
                        map[syn.toLowerCase()] = row.common_name;
                    }
                });
            }
            return map;
        }, {});

        console.log("✅ Loaded Synonym Map from Supabase:", synonymMap);
    } catch (error) {
        console.error("❌ Failed to load synonyms from Supabase:", error);
    }
}

// Load synonyms at startup
loadSynonymsFromSupabase();
// Multer storage for uploaded images
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "./uploads/"); // Save in the "uploads" directory
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    },
});


const upload = multer({ storage: storage });

// Upload scanned grocery bill & process it
router.post("/:userId", upload.single("billImage"), async (req, res) => {
    const { userid } = req.params.userId;
    console.log(' 1111useriddddd :: ' + userid);
    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
    }
    // ✅ Validation Schema
const grocerySchema = Joi.object({
    name: Joi.string().max(255).required(),
    quantity: Joi.number().positive().required(),
    unit: Joi.string().max(50).required(),
    price: Joi.number().min(0).required(),
    date_of_expiry: Joi.date().allow(null),
    date_of_purchase: Joi.date().required(),
});

    const imagePath = req.file.path;

    console.log(`📄 Processing bill image: ${imagePath}`);

    try {
        // Perform OCR on the uploaded image
        const { data } = await Tesseract.recognize(imagePath, "eng");

        console.log("🔍 Extracted Text:", data.text);

        // Parse extracted text into grocery items
        const groceryItems = parseGroceryText(data.text);

        if (groceryItems.length === 0) {
            return res.status(400).json({ error: "No grocery items detected" });
        }
        // Get the current date for date_of_purchase (assuming the bill is from today)
        const dateOfPurchase = extractBillDate(data.text) || new Date().toISOString().split("T")[0];
        console.log("🗓️ Detected Bill Date:", dateOfPurchase);
        

        const validatedItems = [];
        // Save extracted groceries to the database
        for (let item of groceryItems) {
            const { error, value } = grocerySchema.validate({
                name: item.name,
                quantity: item.quantity,
                unit: item.unit || "pcs", // Default to "pcs" if unit is not available
                price: item.price,
                date_of_purchase: dateOfPurchase, // Assign today's date
                date_of_expiry: item.expiryDate // Expiry is optional
            });
        
            if (error) {
                console.error("❌ Validation Error:", error.details[0].message);
                return res.status(400).json({ error: error.details[0].message });
            }
        
            validatedItems.push(value);
        }
       

         res.json({ success: true, message: "Grocery items added to inventory", items: validatedItems });

    } catch (error) {
        console.error("❌ OCR Processing Error:", error);
        res.status(500).json({ error: "Failed to process bill" });
    } finally {
        // Remove uploaded file after processing
        fs.unlink(imagePath, (err) => {
            if (err) console.error("❌ Error deleting uploaded file:", err);
        });
    }
});

// Function to parse grocery items from extracted text
function parseGroceryText(text) {
    // Preprocess text: Remove unwanted symbols and fix number formatting
    text = text.replace(/[|’I]/g, "").replace(/,(\d{3})/g, ".$1");

    const lines = text.split("\n");
    const groceries = [];
    let currentItem = "";

    const itemStartRegex = /^\d+\.\s+/;  // Detects lines starting with "1.", "2.", etc.
    const itemRegex = /^(\d+\.\s+)([\w\s\/-]+)\s+(\d+\.?\d*)\s+(\d+\.?\d*)\s+(\d+\.?\d*)$/;

    lines.forEach((line) => {
        line = line.trim();
        
        if (itemStartRegex.test(line)) {
            // Process previous item
            if (currentItem) {
                processItem(currentItem, groceries, itemRegex);
            }
            currentItem = line; // Start new item
        } else {
            currentItem += " " + line; // Append to the current item
        }
    });

    // Process the last item
    if (currentItem) {
        processItem(currentItem, groceries, itemRegex);
    }

    return groceries;
}

// Function to process an individual item
function processItem(itemText, groceries) {
   // const itemRegex = /^(\d+\.)\s+([\w\s\/-]+)\s+(\d+\.\d{2})\s+(?:\d+\.\d{2}%\s+)?(\d+\.\d{2})\s+(\d+\.\d{2})$/;
    const regex = /^\d+\./;
   // const match = itemText.match(itemRegex);
    const matchSplit = itemText.trim().split(" ");
    if (regex.test(matchSplit[0])){
        const matchLength = matchSplit.length;
         let name = matchSplit[1].trim();
         let totalL = 4;
         
         let temp = matchSplit[matchLength - 4];
         if (temp.endsWith("%")) {
            temp.concat(matchSplit[matchLength - 3]);
            totalL= 5;
         }else {
            temp = matchSplit[matchLength - 3];
         }
        
         for(let i = 2 ; i < matchLength - totalL ; i ++  ){
            name = name.concat(" ").concat( matchSplit[i] );
         }
         name = name.concat(" ").concat(temp);
         name = getCommonName(preprocessName(name));
         if(name) {  
         const quantity = parseFloat(matchSplit[matchLength - 2]);
         const price = parseFloat(matchSplit[matchLength - 1]);
         const currentDate = new Date();
         currentDate.setDate(currentDate.getDate() + findEnumInText(itemText));
         const expiryDate = currentDate.toISOString().split("T")[0];
         
    
         groceries.push({name, quantity, price, expiryDate});
        }
    } else {
        console.log("No match:", itemText); // Debugging
    }
}
function extractBillDate(text) {
    const dateRegex = /Date[:\s]*([0-3]?\d\/[01]?\d\/\d{2})/i; // Matches Date: 07/03/25
    const match = text.match(dateRegex);
    if (match && match[1]) {
        const [day, month, yearShort] = match[1].split("/");
        const fullYear = parseInt(yearShort) < 50 ? "20" + yearShort : "19" + yearShort;
        return `${fullYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`; // Format: YYYY-MM-DD
    }
    return null; // Fallback if not found
}


function findEnumInText(text) {
    const upperText = text.toUpperCase();
    for (const key in GroceryCategory) {
        if (upperText.includes(key)) {
            return GroceryCategory[key]; // Return the corresponding enum value
        }
    }
    return GroceryCategory.DEFAULT; // Return DEFAULT if no match is found
}



function getCommonName(extractedName) {
    const nameLower = extractedName.toLowerCase();
    
    if (synonymMap[nameLower]) {
        return synonymMap[nameLower];
    }
  for (const key in synonymMap) {
    console.log(' key: ' + key);
        if (nameLower.includes(key)) {
            return synonymMap[key];
        }
    }

    const words = nameLower.split(" ");
    for (const word of words) {
        if (synonymMap[word]) {
            return synonymMap[word];
        }
    }

    return null; // Fallback
}

function preprocessName(name) {
    return name.toLowerCase().replace(/[^\w\s]/g, "").trim();
}


module.exports = router;
