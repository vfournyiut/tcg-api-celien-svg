import { Router, Request, Response } from "express";
import { prisma } from "../database";
import { authenticateToken } from "../auth/auth.middleware";

interface RequestWithUser extends Request {
    user?: {
        userId: number;
        email: string;
    };
}

const deckrouter = Router();

/**
 * Formate un deck avec ses cartes associées
 * @param {any} deck - Objet deck de Prisma avec ses cartes
 * @returns {object} Deck formaté avec tableau de cartes
 */
function formatDeckWithCards(deck: any) {
    return {
        id: deck.id,
        name: deck.name,
        userId: deck.userId,
        createdAt: deck.createdAt,
        updatedAt: deck.updatedAt,
        cards: deck.cards.map((dc: any) => dc.card),
    };
}

/**
 * Valide et parse un ID de deck
 * @param {string} id - ID à valider et parser
 * @returns {number|null} ID parsé ou null si invalide
 */
function validateDeckId(id: string): number | null {
    const parsed = parseInt(id, 10);
    return isNaN(parsed) || parsed <= 0 ? null : parsed;
}

/**
 * POST /decks - Créer un deck
 * Crée un nouveau deck avec exactement 10 cartes pour l'utilisateur connecté
 * @param {number} req.body.cards - Array de 10 IDs de cartes
 * @param {string} req.body.name - Nom du deck
 * @returns {201} Deck créé avec ses cartes
 * @throws {401} Utilisateur non authentifié
 * @throws {400} Données invalides ou 10 cartes manquantes
 * @throws {500} Erreur serveur
 */
deckrouter.post("/", authenticateToken, async (req: RequestWithUser, res: Response) => {
    try {
        const userId = req.user?.userId;
        const { name, cards } = req.body;

        if (!userId) {
            return res.status(401).json({ error: "Utilisateur non authentifié" });
        }


        if (!name || typeof name !== "string" || name.trim() === "") {
            return res.status(400).json({ error: "Un nom de deck valide est requis" });
        }


        if (!Array.isArray(cards) || cards.length !== 10) {
            return res.status(400).json({ error: "Le deck doit contenir exactement 10 cartes" });
        }


        if (!cards.every(id => typeof id === "number" && id > 0)) {
            return res.status(400).json({ error: "Les IDs des cartes doivent être positifs" });
        }


        const existingCards = await prisma.card.findMany({
            where: { id: { in: cards } },
        });

        if (existingCards.length !== 10) {
            return res.status(400).json({ error: "Certaines cartes sont invalides ou manquantes" });
        }

        // Créer le deck
        const deck = await prisma.deck.create({
            data: {
                name: name.trim(),
                userId,
            },
        });

        // Associer les cartes
        await prisma.deckCard.createMany({
            data: cards.map((cardId) => ({
                deckId: deck.id,
                cardId,
            })),
        });

        // Récupérer le deck avec ses cartes
        const deckWithCards = await prisma.deck.findUnique({
            where: { id: deck.id },
            include: {
                cards: {
                    include: { card: true },
                },
            },
        });

        return res.status(201).json({
            message: "Deck créé avec succès",
            deck: formatDeckWithCards(deckWithCards),
        });
    } catch (error) {
        console.error("Erreur lors de la création du deck:", error);
        return res.status(500).json({ error: "Erreur serveur lors de la création du deck" });
    }
});

/**
 * GET /decks/mine - Liste les decks de l'utilisateur
 * Retourne tous les decks créés par l'utilisateur connecté
 * @returns {200} Objet avec count et array de decks
 * @throws {401} Utilisateur non authentifié
 * @throws {500} Erreur serveur
 */
deckrouter.get("/mine", authenticateToken, async (req: RequestWithUser, res: Response) => {
    try {
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({ error: "Utilisateur non authentifié" });
        }

        const decks = await prisma.deck.findMany({
            where: { userId },
            include: {
                cards: {
                    include: { card: true },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        const formatted = decks.map(formatDeckWithCards);

        return res.status(200).json({
            message: "Decks récupérés avec succès",
            count: formatted.length,
            decks: formatted,
        });
    } catch (error) {
        console.error("Erreur lors de la récupération des decks:", error);
        return res.status(500).json({ error: "Erreur serveur lors de la récupération des decks" });
    }
});

/**
 * GET /decks/:id - Récupérer un deck spécifique
 * Retourne les détails d'un deck si l'utilisateur en est propriétaire
 * @param {number} req.params.id - ID du deck
 * @returns {200} Deck avec ses cartes
 * @throws {400} ID invalide
 * @throws {401} Utilisateur non authentifié
 * @throws {403} Accès non autorisé
 * @throws {404} Deck non trouvé
 * @throws {500} Erreur serveur
 */
deckrouter.get("/:id", authenticateToken, async (req: RequestWithUser, res: Response) => {
    try {
        const userId = req.user?.userId;
        const deckId = validateDeckId(req.params.id);

        if (!userId) {
            return res.status(401).json({ error: "Utilisateur non authentifié" });
        }

        if (deckId === null) {
            return res.status(400).json({ error: "ID de deck invalide" });
        }

        const deck = await prisma.deck.findUnique({
            where: { id: deckId },
            include: {
                cards: {
                    include: { card: true },
                },
            },
        });

        if (!deck) {
            return res.status(404).json({ error: "Deck non trouvé" });
        }


        if (deck.userId !== userId) {
            return res.status(403).json({ error: "Vous n avez pas accès à ce deck" });
        }

        return res.status(200).json({
            message: "Deck récupéré avec succès",
            deck: formatDeckWithCards(deck),
        });
    } catch (error) {
        console.error("Erreur lors de la récupération du deck:", error);
        return res.status(500).json({ error: "Erreur serveur lors de la récupération du deck" });
    }
});

/**
 * PATCH /decks/:id - Modifier un deck
 * Met à jour le nom et/ou les 10 cartes du deck
 * @param {number} req.params.id - ID du deck
 * @param {string} [req.body.name] - Nouveau nom du deck
 * @param {number[]} [req.body.cards] - Nouveaux IDs de 10 cartes
 * @returns {200} Deck modifié
 * @throws {400} ID invalide ou données invalides
 * @throws {401} Utilisateur non authentifié
 * @throws {403} Accès non autorisé
 * @throws {404} Deck non trouvé
 * @throws {500} Erreur serveur
 */
deckrouter.patch("/:id", authenticateToken, async (req: RequestWithUser, res: Response) => {
    try {
        const userId = req.user?.userId;
        const deckId = validateDeckId(req.params.id);
        const { name, cards } = req.body;

        if (!userId) {
            return res.status(401).json({ error: "Utilisateur non authentifié" });
        }

        if (deckId === null) {
            return res.status(400).json({ error: "ID de deck invalide" });
        }

        const existingDeck = await prisma.deck.findUnique({
            where: { id: deckId },
        });

        if (!existingDeck) {
            return res.status(404).json({ error: "Deck non trouvé" });
        }

        if (existingDeck.userId !== userId) {
            return res.status(403).json({ error: "Vous n avez pas accès à ce deck" });
        }


        const updateData: any = {};

        if (name !== undefined) {
            if (typeof name !== "string" || name.trim() === "") {
                return res.status(400).json({ error: "Le nom du deck doit être une chaîne non vide" });
            }
            updateData.name = name.trim();
        }


        if (cards !== undefined) {
            if (!Array.isArray(cards) || cards.length !== 10) {
                return res.status(400).json({ error: "Le deck doit contenir exactement 10 cartes" });
            }


            if (!cards.every(id => typeof id === "number" && id > 0)) {
                return res.status(400).json({ error: "Les IDs des cartes doivent être des nombres positifs" });
            }

            const existingCards = await prisma.card.findMany({
                where: { id: { in: cards } },
            });

            if (existingCards.length !== 10) {
                return res.status(400).json({ error: "Certaines cartes sont invalides ou manquantes" });
            }


            await prisma.deckCard.deleteMany({
                where: { deckId: deckId },
            });

            await prisma.deckCard.createMany({
                data: cards.map((cardId) => ({
                    deckId: deckId,
                    cardId,
                })),
            });
        }

        const updatedDeck = await prisma.deck.update({
            where: { id: deckId },
            data: updateData,
            include: {
                cards: {
                    include: { card: true },
                },
            },
        });

        return res.status(200).json({
            message: "Deck modifié avec succès",
            deck: formatDeckWithCards(updatedDeck),
        });
    } catch (error) {
        console.error("Erreur lors de la modification du deck:", error);
        return res.status(500).json({ error: "Erreur serveur lors de la modification du deck" });
    }
});

/**
 * DELETE /decks/:id - Supprimer un deck
 * Supprime définitivement un deck et toutes ses cartes associées
 * @param {number} req.params.id - ID du deck à supprimer
 * @returns {200} Message de confirmation
 * @throws {400} ID invalide
 * @throws {401} Utilisateur non authentifié
 * @throws {403} Accès non autorisé
 * @throws {404} Deck non trouvé
 * @throws {500} Erreur serveur
 */
deckrouter.delete("/:id", authenticateToken, async (req: RequestWithUser, res: Response) => {
    try {
        const userId = req.user?.userId;
        const deckId = validateDeckId(req.params.id);

        if (!userId) {
            return res.status(401).json({ error: "Utilisateur non authentifié" });
        }

        if (deckId === null) {
            return res.status(400).json({ error: "ID de deck invalide" });
        }

        const existingDeck = await prisma.deck.findUnique({
            where: { id: deckId },
        });

        if (!existingDeck) {
            return res.status(404).json({ error: "Deck non trouvé" });
        }

        if (existingDeck.userId !== userId) {
            return res.status(403).json({ error: "Vous n avez pas accès à ce deck" });
        }


        await prisma.deckCard.deleteMany({
            where: { deckId: deckId },
        });


        await prisma.deck.delete({
            where: { id: deckId },
        });

        return res.status(200).json({
            message: "Deck supprimé avec succès",
            deckId: deckId,
        });
    } catch (error) {
        console.error("Erreur lors de la suppression du deck:", error);
        return res.status(500).json({ error: "Erreur serveur lors de la suppression du deck" });
    }
});

export default deckrouter;
