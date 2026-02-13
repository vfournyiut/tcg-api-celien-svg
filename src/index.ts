import express from "express";
import cors from "cors";
import cardsRoutes from "./cards/cards.route";
import deckrouter from "./decks/decks.route";
import swaggerUi from "swagger-ui-express";
import { swaggerDocument } from "./docs";
import { authRouter } from "./auth/auth.route";

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Routes API
app.use("/auth", authRouter);
app.use("/api/cards", cardsRoutes);
app.use("/api/decks", deckrouter);

// Swagger documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Test route
app.get("/", (req, res) => {
    res.json({ message: "TCG API is running" });
});

// Start server
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📘 Swagger docs available at http://localhost:${PORT}/api-docs`);
});

