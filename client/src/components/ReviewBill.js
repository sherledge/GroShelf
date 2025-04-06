import React, { useState , useContext} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { AuthContext } from "../App";
import Navbar from "./Navbar";

const ReviewBill = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { extractedData } = location.state || { extractedData: [] };
  const detectUnitAndQuantity = (name, quantity) => {
    const lower = name.toLowerCase();
  
    if (lower.includes("sugar") || lower.includes("onion") ) {
      return { unit: "kg", quantity: quantity || 1 };
    }
    if (lower.includes("cinnamon")) {
      return { unit: "g", quantity: quantity || 100 };
    }
    if (lower.includes("chilli powder")) {
      return { unit: "g", quantity: quantity || 200 };
    }
    // Defaults for known 'piece' based items
    const pcsItems = ["coffee", "cheese", "salt", "chia", "oregano"];
    for (let item of pcsItems) {
      if (lower.includes(item)) {
        return { unit: "pcs", quantity: quantity || 1 };
      }
    }
  
    // Fallback
    return { unit: "pcs", quantity: quantity || 1 };
  };
  
  const formattedData = extractedData.map(item => {
    const name = item.name || item.item_name || "";
    const { unit, quantity } = detectUnitAndQuantity(name, item.quantity);
  
    let expiry = "";
  
    const lower = name.toLowerCase();
  
    if (lower.includes("milk")) {
      expiry = "2025-04-08";
    } else if (lower.includes("bread")) {
      expiry = "2025-04-10";
    } else if (lower.includes("sugar")) {
      expiry = "2026-04-01";
    } else if (lower.includes("salt")) {
      expiry = "2026-03-20";
    } else if (lower.includes("cheese")) {
      expiry = "2025-04-20";
    } else if (lower.includes("onion")) {
      expiry = "2025-05-01";
    } else if (lower.includes("cinnamon")) {
      expiry = "2026-09-01";
    } else if (lower.includes("chilli powder")) {
      expiry = "2026-01-01";
    } else if (lower.includes("rice")) {
      expiry = "2026-06-15";
    } else {
      expiry = "2025-12-31"; // default fallback
    }
  
    return {
      ...item,
      name,
      quantity,
      unit,
      date_of_expiry: expiry,
      date_of_purchase: item.date_of_purchase ? item.date_of_purchase.split("T")[0] : new Date().toISOString().split("T")[0],
      original_expiry: expiry,
      isRisk: false,
    };
  });
  
  
  const [editedData, setEditedData] = useState(formattedData);

  const handleChange = (index, field, value) => {
    const updatedItems = [...editedData];
    
    if (field === "isRisk") {
      if (value) {
        const purchaseDate = new Date(updatedItems[index].date_of_purchase);
        purchaseDate.setDate(purchaseDate.getDate() + 3);
        updatedItems[index].date_of_expiry = purchaseDate.toISOString().split("T")[0];
      } else {
        updatedItems[index].date_of_expiry = updatedItems[index].original_expiry
          ? new Date(updatedItems[index].original_expiry).toISOString().split("T")[0]
          : "";
      }
      updatedItems[index].isRisk = value;
    } else {
      if (field === "quantity" || field === "price") {
        const parsed = parseFloat(value);
        if (value === "") {
          updatedItems[index][field] = "";
        } else if (!isNaN(parsed)) {
          updatedItems[index][field] = parsed;
        }
      }
      
    }
  
    setEditedData(updatedItems);
  };
  

  const handleBulkSave = async () => {
    try {
      const formattedItems = editedData.map(item => ({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        price: item.price,
        date_of_expiry: item.date_of_expiry ? new Date(item.date_of_expiry).toISOString() : null,
        date_of_purchase: item.date_of_purchase ? new Date(item.date_of_purchase).toISOString() : null
      }));

      await axios.post(`http://localhost:5000/api/groceries/${user.id}/bulk`, {
        items: formattedItems,
      });
      alert("Grocery items saved successfully!");
      navigate("/inventory");
    } catch (error) {
      console.error("Error saving items:", error);
      alert("Failed to save items.");
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px' }}>
      <Navbar />
      <div>
        <h2>Review Extracted Bill Details</h2>
        {editedData.length > 0 ? (
          <table border="1" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px', backgroundColor: '#dff0d8' }}>
            <thead>
              <tr style={{ backgroundColor: '#4CAF50', color: 'white', fontWeight: 'bold' }}>
                <th>Name</th>
                <th>Quantity</th>
                <th>Unit</th>
                <th>Price</th>
                <th>Expiry Date</th>
                <th>Risk?</th>
                <th>Purchase Date</th>
              </tr>
            </thead>
            <tbody>
              {editedData.map((item, index) => (
                <tr key={index}>
                  <td>
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => handleChange(index, "name", e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleChange(index, "quantity", e.target.value)}
                    />
                  </td>
                  <td>
                    <select
                      value={item.unit}
                      onChange={(e) => handleChange(index, "unit", e.target.value)}
                    >
                      <option value="kg">kg</option>
                      <option value="g">g</option>
                      <option value="pcs">pcs</option>
                      <option value="L">L</option>
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      value={item.price}
                      onChange={(e) => handleChange(index, "price", e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="date"
                      value={item.date_of_expiry}
                      onChange={(e) => handleChange(index, "date_of_expiry", e.target.value)}
                    />
                    {console.log(`Row ${index} Expiry Date:`, item.date_of_expiry)}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <input
                      type="checkbox"
                      checked={item.isRisk}
                      onChange={(e) => handleChange(index, "isRisk", e.target.checked)}
                      style={{ width: "20px", height: "20px" }}
                    />
                  </td>
                  <td>
                    <input
                      type="date"
                      value={item.date_of_purchase}
                      onChange={(e) => handleChange(index, "date_of_purchase", e.target.value)}
                    />
                    {console.log(`Row ${index} Purchase Date:`, item.date_of_purchase)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No data extracted. Please try again.</p>
        )}

        <button onClick={handleBulkSave}>Save All</button>
        <button onClick={() => navigate(-1)}>Back</button>
      </div>
    </div>
  );
};

export default ReviewBill;
