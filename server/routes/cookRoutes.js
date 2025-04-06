const express = require("express");
const { supabase } = require("../db");
const router = express.Router();

router.post("/", async (req, res) => {
    console.log("🔥 /api/cook POST hit");

    const { userid, recipeid, pax, ingredientsUsed } = req.body;

    if (!userid || !recipeid || !pax || !ingredientsUsed || ingredientsUsed.length === 0) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        console.log(`🔹 Processing cooking request for user ${userid}, recipe ${recipeid}...`);

        // 🍳 Cooking logic: update groceries
        for (const ingredient of ingredientsUsed) {
            const name = ingredient.ingredient_name;
            const qty = parseFloat(ingredient.ingredient_quantity);
            const unit = ingredient.ingredient_unit;

            if (!name || isNaN(qty) || !unit) {
                console.warn("❌ Invalid ingredient:", ingredient);
                continue;
            }

            const formattedName = name.trim().toLowerCase();

            const { data: groceryData, error: fetchError } = await supabase
                .from("groceries")
                .select("*")
                .ilike("name", formattedName)
                .eq("userid", userid);

            if (fetchError) {
                console.error("❌ Error fetching grocery:", fetchError);
                continue;
            }

            const grocery = groceryData[0];
            if (!grocery) {
                console.warn(`❌ Grocery not found for ingredient: ${formattedName}`);
                continue;
            }

            const currentQty = parseFloat(grocery.quantity);
            const newQty = currentQty - qty;

            if (newQty <= 0) {
                // Delete grocery if quantity is zero or negative
                const { error: deleteError } = await supabase
                    .from("groceries")
                    .delete()
                    .eq("groceryid", grocery.groceryid);

                if (deleteError) {
                    console.error("❌ Error deleting grocery:", deleteError);
                } else {
                    console.log(`🗑️ Deleted ${formattedName} (quantity reached 0)`);
                }
            } else {
                // Update grocery quantity
                const { error: updateError, data: updateData } = await supabase
                    .from("groceries")
                    .update({ quantity: newQty })
                    .eq("groceryid", grocery.groceryid)
                    .select();

                if (updateError) {
                    console.error("❌ Error updating grocery quantity:", updateError);
                } else {
                    console.log(`✅ Updated ${formattedName}: ${currentQty} → ${newQty}`);
                    console.log("📝 Updated row:", updateData[0]);
                }
            }
        }

        // 💾 Save to calculations
        const { data, error } = await supabase
            .from("calculations")
            .insert([{
                userid,
                recipeid,
                pax,
                ingredients_used: JSON.stringify(ingredientsUsed),
                portionwasted: 0,
            }])
            .select();

        if (error) {
            console.error("❌ Supabase Error inserting calculation:", error);
            return res.status(500).json({ error: "Failed to save cooking data", details: error.message });
        }

        res.status(200).json({
            message: "Cooking process completed!",
            calculationid: data[0].calculationid,
        });

    } catch (err) {
        console.error("❌ Server Error:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
});

// ✅ Update waste portion for a cooked recipe
router.put("/waste/:calculationId", async (req, res) => {
  const { calculationId } = req.params;
  const { portionwasted } = req.body;

  if (!portionwasted || isNaN(portionwasted)) {
      return res.status(400).json({ error: "Invalid or missing portionwasted value" });
  }

  try {
      const { data, error } = await supabase
          .from("calculations")
          .update({ portionwasted: parseFloat(portionwasted) })
          .eq("calculationid", calculationId)
          .select();

      if (error) {
          console.error("❌ Supabase error updating waste:", error);
          return res.status(500).json({ error: "Failed to update waste data" });
      }

      res.status(200).json({
          message: "Waste recorded successfully!",
          updated: data[0]
      });

  } catch (err) {
      console.error("❌ Server error while recording waste:", err);
      res.status(500).json({ error: "Server error", details: err.message });
  }
});


module.exports = router;