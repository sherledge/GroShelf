import React, { useState, useEffect } from "react";
import axios from "axios";
import Navbar from "./Navbar";
import { useNavigate } from "react-router-dom";

function CookingManager({ userId }) {
    const [recipes, setRecipes] = useState([]);
    const [selectedRecipe, setSelectedRecipe] = useState(null);
    const [pax, setPax] = useState("");
    const [portionWasted, setPortionWasted] = useState("");
    const [calculationId, setCalculationId] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (userId) {
            fetchRecommendations();
        } else {
            console.warn("userId is undefined or null, skipping fetch.");
        }
    }, [userId]);

    const fetchRecommendations = async () => {
        try {
            const response = await axios.get(`http://localhost:5000/api/recommendations/recommend/${userId}`);
            if (Array.isArray(response.data) && response.data.length > 0) {
                setRecipes(response.data);
            } else {
                console.warn("No recipes found in API response.");
                setRecipes([]);
            }
        } catch (error) {
            console.error("Error fetching recipes:", error);
        }
    };

    const handleCook = async () => {
        if (!selectedRecipe || !pax) {
            alert("Please select a recipe and enter the number of pax.");
            return;
        }

        console.log("Cooking with payload:", {
            userid: userId,
            recipeid: selectedRecipe.recipeid,
            pax: parseInt(pax),
            ingredientsUsed: selectedRecipe.grocerymatched,
        });
        console.log("Ingredients used:", selectedRecipe.grocerymatched);
        try {
            const response = await axios.post("http://localhost:5000/api/cook/", {
                userid: userId,
                recipeid: selectedRecipe.recipeid,
                pax: parseInt(pax),
                ingredientsUsed: selectedRecipe.grocerymatched,
            });
            console.log("Ingredients used:", selectedRecipe.grocerymatched);

            alert(response.data.message);
            setCalculationId(response.data.calculationid);
            fetchRecommendations();
        } catch (error) {
            console.error("❌ Error cooking recipe:", error.response?.data || error.message);
        }
    };

    const handleWasteSubmit = async () => {
        if (!calculationId || !portionWasted) {
            alert("Please cook a recipe first and then enter portion wasted.");
            return;
        }

        try {
            await axios.put(`http://localhost:5000/api/cook/waste/${calculationId}`, {
                portionwasted: parseFloat(portionWasted),
            });
            alert("Waste recorded successfully!");
        } catch (error) {
            console.error("Error recording waste:", error.response?.data || error.message);
        }
    };

    const styles = {
        container: {
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "20px",
            fontFamily: "'Arial', sans-serif",
            background: "#f9f9f9",
            minHeight: "100vh",
        },
        title: {
            fontSize: "28px",
            fontWeight: "bold",
            color: "#358856",
            textAlign: "center",
            marginBottom: "20px",
        },
        formGroup: {
            display: "flex",
            flexDirection: "column",
            marginBottom: "15px",
            width: "80%",
            maxWidth: "400px",
        },
        label: {
            fontSize: "18px",
            fontWeight: "bold",
            marginBottom: "5px",
        },
        input: {
            padding: "10px",
            fontSize: "16px",
            border: "2px solid #ccc",
            borderRadius: "8px",
            width: "100%",
        },
        button: {
            padding: "12px",
            fontSize: "16px",
            fontWeight: "bold",
            color: "white",
            backgroundColor: "#2e856e",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            transition: "background-color 0.3s ease",
            marginTop: "10px",
            width: "100%",
        },
        buttonHover: {
            backgroundColor: "#1e3a34",
        },
        navigationButtons: {
            display: "flex",
            gap: "10px",
            marginBottom: "20px",
        },
        navButton: {
            padding: "10px",
            fontSize: "14px",
            fontWeight: "bold",
            color: "white",
            backgroundColor: "#007BFF",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            transition: "background-color 0.3s ease",
        },
    };

    return (
        <div style={styles.container}>
            <Navbar />
            <h1 style={styles.title}>Cooking Manager</h1>

            <div style={styles.navigationButtons}>
                <button style={styles.navButton} onClick={() => navigate("/groceries")}>Grocery Manager</button>
                <button style={styles.navButton} onClick={() => navigate("/inventory")}>Inventory</button>
                <button style={styles.navButton} onClick={() => navigate("/user-dashboard")}>User Dashboard</button>
            </div>

            <div style={styles.formGroup}>
                <label style={styles.label}>Select Recipe:</label>
                <select
                    onChange={(e) => {
                        const index = parseInt(e.target.value);
                        const selected = recipes[index];
                        console.log("Selected Recipe:", selected);
                        setSelectedRecipe(selected);
                    }}
                    style={styles.input}
                >
                    <option value="">-- Select --</option>
                    {recipes.map((recipe, index) => (
                        <option key={recipe.recipeid} value={index}>
                            {recipe.recipename} - Matched: {(recipe.grocerymatched || []).map(g => g.ingredient_name).join(", ")}
                        </option>
                    ))}
                </select>
            </div>

            <div style={styles.formGroup}>
                <label style={styles.label}>Servings (Pax):</label>
                <input type="number" value={pax} onChange={(e) => setPax(e.target.value)} style={styles.input} />
            </div>

            <button
                style={styles.button}
                onClick={handleCook}
                onMouseOver={(e) => (e.target.style.backgroundColor = styles.buttonHover.backgroundColor)}
                onMouseOut={(e) => (e.target.style.backgroundColor = styles.button.backgroundColor)}
            >
                Cook
            </button>

            <div style={styles.formGroup}>
                <h3>Food Waste</h3>
                <label style={styles.label}>Portion Wasted:</label>
                <input type="number" value={portionWasted} onChange={(e) => setPortionWasted(e.target.value)} style={styles.input} />
                <button
                    style={styles.button}
                    onClick={handleWasteSubmit}
                    onMouseOver={(e) => (e.target.style.backgroundColor = styles.buttonHover.backgroundColor)}
                    onMouseOut={(e) => (e.target.style.backgroundColor = styles.button.backgroundColor)}
                >
                    Submit Waste
                </button>
            </div>
        </div>
    );
}

export default CookingManager;
