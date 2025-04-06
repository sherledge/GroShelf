const express = require("express");
const { supabase } = require("../db");
const router = express.Router();

router.get("/recommend/:userid", async (req, res) => {
    const { userid } = req.params;
    console.log("🔍 Recommend route hit for user:", userid);

    try {
        const { data: groceries, error: groceriesError } = await supabase
            .from("groceries")
            .select("name, quantity")
            .eq("userid", userid)
            .gt("quantity", 0);

        if (groceriesError) {
            console.error("❌ Error fetching groceries:", groceriesError);
            return res.status(500).json({ error: "Error fetching groceries" });
        }

        console.log("📦 User groceries:", groceries);

        const { data: recipes, error: recipesError } = await supabase
            .from("recipes")
            .select("recipeid, name, cooking_time, steps, sustainability_notes, ingredients");

        if (recipesError) {
            console.error("❌ Error fetching recipes:", recipesError);
            return res.status(500).json({ error: "Error fetching recipes" });
        }

        console.log("📖 All recipes:", recipes.length);

        const matchedRecipes = recipes.map((recipe) => {
            let ingredients = [];

            try {
                ingredients =
                    typeof recipe.ingredients === "string"
                        ? JSON.parse(recipe.ingredients)
                        : recipe.ingredients;

                if (!Array.isArray(ingredients)) return null;
            } catch (e) {
                console.error("❌ Failed to parse ingredients for recipe:", recipe.recipeid, e);
                return null;
            }
            console.log("Raw recipe.ingredients:", recipe.ingredients);
            console.log("Parsed ingredients:", ingredients);

            const grocerymatched = ingredients.map((i) => {
                const matchingGrocery = groceries.find((g) => {
                    const recipeIngredientName = i.name?.trim().toLowerCase();
                    const groceryName = g.name?.trim().toLowerCase();
    
                    console.log("Comparing:", recipeIngredientName, "with", groceryName); // Debugging log
    
                    return groceryName === recipeIngredientName;
                });
    
                return {
                    ingredient_name: i.item,
                    ingredient_quantity: i.quantity || "Not specified",
                    available_quantity: matchingGrocery?.quantity ?? "Unknown",
                    ingredient_unit: i.unit || "Unknown",
                };
            });

            ingredients = ingredients.filter((i) => i && i.name); // Unified to i.name

            const allIngredientsAvailable = ingredients.every(ingredient => {
                const groceryItem = groceries.find(g =>
                    g.name?.trim().toLowerCase() === ingredient.name?.trim().toLowerCase() // Unified to ingredient.name
                );

                return groceryItem && (!ingredient.quantity || groceryItem.quantity >= ingredient.quantity);
            });

            if (!allIngredientsAvailable) {
                return null;
            }

            console.log(`✅ Matched recipe: ${recipe.name}`, grocerymatched);

            return {
                recipeid: recipe.recipeid,
                recipename: recipe.name.trim(),
                cooking_time: recipe.cooking_time || "Not specified",
                steps: recipe.steps || "No steps provided",
                sustainability_notes: recipe.sustainability_notes || "No sustainability notes",
                grocerymatched,
            };
        }).filter(Boolean);

        res.status(200).json(matchedRecipes);
    } catch (err) {
        console.error("🔥 Internal Error:", err);
        res.status(500).json({ error: "Internal Server Error", details: err.message });
    }
});

module.exports = router;