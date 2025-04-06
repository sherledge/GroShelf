import React, { useEffect, useState } from "react";
import axios from "axios";
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Legend
} from "recharts";

const FoodWasteGraphs = ({ userId }) => {
    const [wasteData, setWasteData] = useState([]);
    const [weeklyWaste, setWeeklyWaste] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchWasteData(userId);
    }, [userId]);

    const fetchWasteData = async (userId) => {
        try {
            setLoading(true);

            const [summaryRes, weeklyRes] = await Promise.all([
                axios.get(`http://localhost:5000/api/food-waste/waste-summary/${userId}`),
                axios.get(`http://localhost:5000/api/food-waste/weekly-waste/${userId}`)
            ]);

            const summary = summaryRes.data;
            const weekly = weeklyRes.data;

            if (summary) {
                setWasteData([
                    { name: "Expired Waste", value: summary.expiredWaste },
                    { name: "Portion Waste", value: summary.portionWaste }
                ]);
            }

            if (Array.isArray(weekly)) {
                const formattedWeekly = weekly.map(item => ({
                    week: item.week,
                    expiredWaste: item.expiredwaste,
                    portionWaste: item.portionwaste
                }));
                setWeeklyWaste(formattedWeekly);
            }

        } catch (error) {
            console.error("❌ Error fetching food waste data:", error);
        } finally {
            setLoading(false);
        }
    };

    const COLORS = ["#FF5733", "#3498DB"];

    return (
        <div style={{ width: "100%", textAlign: "center", padding: "2rem" }}>
            <h3>Food Waste Breakdown</h3>

            {loading ? (
                <p>Loading...</p>
            ) : wasteData.every(item => item.value === 0) ? (
                <p>No food waste data available yet.</p>
            ) : (
                <ResponsiveContainer width="50%" height={300}>
                    <PieChart>
                        <Pie
                            data={wasteData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            label
                        >
                            {wasteData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                    </PieChart>
                </ResponsiveContainer>
            )}

            <h3 style={{ marginTop: "3rem" }}>Weekly Waste Breakdown</h3>

            {weeklyWaste.length === 0 ? (
                <p>No weekly waste data available.</p>
            ) : (
                <ResponsiveContainer width="80%" height={300}>
                    <BarChart data={weeklyWaste}>
                        <XAxis dataKey="week" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="expiredWaste" stackId="a" fill="#FF5733" name="Expired Waste" />
                        <Bar dataKey="portionWaste" stackId="a" fill="#3498DB" name="Portion Waste" />
                    </BarChart>
                </ResponsiveContainer>
            )}
        </div>
    );
};

export default FoodWasteGraphs;
