import { Router } from "express";
import { prisma } from "../database";


const cardsRouter = Router();

// GET /cards - Récupérer toutes les cartes
cardsRouter.get("/", async (_req, res) => {
    try {
        const cards = await prisma.card.findMany({
            orderBy: { pokedexNumber: 'asc' }
        });
        return res.status(200).json(cards);
    }catch (error:any) {
        return res.status(500).json({ error: "Failed to retrieve cards" });
    }
});

export default  cardsRouter ;