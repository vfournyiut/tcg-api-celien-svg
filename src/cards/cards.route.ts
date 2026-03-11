import { Router } from 'express'
import { prisma } from '../database'

const cardsRouter = Router()

/**
 * GET /cards - Récupérer toutes les cartes
 * Retourne la liste complète des cartes triées par numéro Pokédex
 * @returns {200} Array de toutes les cartes
 * @throws {500} Erreur serveur lors de la récupération des cartes
 */
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

export default cardsRouter
