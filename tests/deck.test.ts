import {describe, it, expect, beforeEach, vi, afterEach} from 'vitest'
import request from 'supertest'
import {app} from '../src/index'
import {prisma} from '../src/database'
import jwt from 'jsonwebtoken'

vi.mock('../src/database', () => ({
    prisma: {
        deck: {
            create: vi.fn(),
            findMany: vi.fn(),
            findUnique: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        },
        card: {
            findMany: vi.fn(),
        },
        deckCard: {
            createMany: vi.fn(),
            deleteMany: vi.fn(),
        },
    },
}))

vi.mock('jsonwebtoken')

const SECRET_KEY = process.env.JWT_SECRET || 'test_secret'

// Données de test
const testUserId = 1
const testUserEmail = 'test@example.com'
const validToken = jwt.sign(
    {userId: testUserId, email: testUserEmail},
    SECRET_KEY,
    {expiresIn: '1h'}
)
// créer un deck d'exemple 
const mockDeck = {
    id: 1,
    name: 'Mon Premier Deck',
    userId: testUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
    cards: [
        {
            deckId: 1,
            cardId: 1,
            card: {id: 1, name: 'Pikachu', rarity: 'Rare'},
        },
        {
            deckId: 1,
            cardId: 2,
            card: {id: 2, name: 'Charizard', rarity: 'Ultra Rare'},
        },
        {
            deckId: 1,
            cardId: 3,
            card: {id: 3, name: 'Blastoise', rarity: 'Rare'},
        },
        {
            deckId: 1,
            cardId: 4,
            card: {id: 4, name: 'Venusaur', rarity: 'Rare'},
        },
        {
            deckId: 1,
            cardId: 5,
            card: {id: 5, name: 'Dragonite', rarity: 'Ultra Rare'},
        },
        {
            deckId: 1,
            cardId: 6,
            card: {id: 6, name: 'Gyarados', rarity: 'Rare'},
        },
        {
            deckId: 1,
            cardId: 7,
            card: {id: 7, name: 'Arcanine', rarity: 'Rare'},
        },
        {
            deckId: 1,
            cardId: 8,
            card: {id: 8, name: 'Lapras', rarity: 'Rare'},
        },
        {
            deckId: 1,
            cardId: 9,
            card: {id: 9, name: 'Snorlax', rarity: 'Rare'},
        },
        {
            deckId: 1,
            cardId: 10,
            card: {id: 10, name: 'Machamp', rarity: 'Rare'},
        },
    ],
}

const mockCards = Array.from({length: 10}, (_, i) => ({
    id: i + 1,
    name: `Card${i + 1}`,
    rarity: 'Rare',
}))

describe('Deck CRUD Operations', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(jwt.verify).mockReturnValue({
            userId: testUserId,
            email: testUserEmail,
        } as any)
    })

    afterEach(() => {
        vi.resetAllMocks()
    })
// création de deck
    describe('CREATE - POST /api/decks', () => {
        it('devrait créer un deck avec 10 cartes valides', async () => {
            vi.mocked(prisma.card.findMany).mockResolvedValue(mockCards as any)
            vi.mocked(prisma.deck.create).mockResolvedValue({
                id: 1,
                name: 'Mon Deck',
                userId: testUserId,
                createdAt: new Date(),
                updatedAt: new Date(),
            } as any)
            vi.mocked(prisma.deckCard.createMany).mockResolvedValue({count: 10})
            vi.mocked(prisma.deck.findUnique).mockResolvedValue(mockDeck as any)

            const response = await request(app)
                .post('/api/decks')
                .set('Authorization', `Bearer ${validToken}`)
                .send({
                    name: 'Mon Deck',
                    cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
                })

            expect(response.status).toBe(201)
            expect(response.body.message).toBe('Deck créé avec succès')
            expect(response.body.deck.name).toBe('Mon Premier Deck')
            expect(response.body.deck.cards.length).toBe(10)
            expect(prisma.deck.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        name: 'Mon Deck',
                        userId: testUserId,
                    }),
                })
            )
        })
// pas d'utilisateur authentifié
        it('devrait retourner 401 si l utilisateur n est pas authentifié', async () => {
            const response = await request(app)
                .post('/api/decks')
                .send({
                    name: 'Mon Deck',
                    cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
                })

            expect(response.status).toBe(401)
            expect(response.body.error).toBe('Token manquant')
        })
//nom de deck valide
        it('devrait retourner 400 si le nom est vide', async () => {
            const response = await request(app)
                .post('/api/decks')
                .set('Authorization', `Bearer ${validToken}`)
                .send({
                    name: '',
                    cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
                })

            expect(response.status).toBe(400)
            expect(response.body.error).toContain('nom de deck')
        })
// pas le noombre de carte requis
        it('devrait retourner 400 si le deck n a pas exactement 10 cartes', async () => {
            const response = await request(app)
                .post('/api/decks')
                .set('Authorization', `Bearer ${validToken}`)
                .send({
                    name: 'Mon Deck',
                    cards: [1, 2, 3, 4, 5],
                })

            expect(response.status).toBe(400)
            expect(response.body.error).toContain('10 cartes')
        })
// carte invalide
        it('devrait retourner 400 si les IDs des cartes sont invalides', async () => {
            const response = await request(app)
                .post('/api/decks')
                .set('Authorization', `Bearer ${validToken}`)
                .send({
                    name: 'Mon Deck',
                    cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 'invalid'],
                })

            expect(response.status).toBe(400)
            expect(response.body.error).toContain('positifs')
        })
// carte inexistante
        it('devrait retourner 400 si certaines cartes n existent pas', async () => {
            vi.mocked(prisma.card.findMany).mockResolvedValue([mockCards[0]] as any)

            const response = await request(app)
                .post('/api/decks')
                .set('Authorization', `Bearer ${validToken}`)
                .send({
                    name: 'Mon Deck',
                    cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
                })

            expect(response.status).toBe(400)
            expect(response.body.error).toContain('invalides ou manquantes')
        })

        it('devrait retourner 401 si le token décodé ne contient pas userId (POST)', async () => {
            // simulate token present but decoded without userId
            vi.mocked(jwt.verify).mockReturnValueOnce({} as any)

            const response = await request(app)
                .post('/api/decks')
                .set('Authorization', `Bearer some_token`)
                .send({ name: 'Mon Deck', cards: [1,2,3,4,5,6,7,8,9,10] })

            expect(response.status).toBe(401)
            expect(response.body.error).toBe('Utilisateur non authentifié')
        })

        it('devrait retourner 500 si une exception est levée pendant la création (POST)', async () => {
            vi.mocked(jwt.verify).mockReturnValueOnce({userId: testUserId, email: testUserEmail} as any)
            vi.mocked(prisma.card.findMany).mockResolvedValue(mockCards as any)
            vi.mocked(prisma.deck.create).mockRejectedValue(new Error('boom'))

            const response = await request(app)
                .post('/api/decks')
                .set('Authorization', `Bearer ok`)
                .send({ name: 'Mon Deck', cards: [1,2,3,4,5,6,7,8,9,10] })

            expect(response.status).toBe(500)
            expect(response.body.error).toBe('Erreur serveur lors de la création du deck')
        })
        
    })
// mes deck 
    describe('READ - GET /api/decks/mine', () => {
// retourne mes decks
        it('devrait récupérer tous les decks de l utilisateur', async () => {
            vi.mocked(prisma.deck.findMany).mockResolvedValue([mockDeck] as any)

            const response = await request(app)
                .get('/api/decks/mine')
                .set('Authorization', `Bearer ${validToken}`)

            expect(response.status).toBe(200)
            expect(response.body.message).toBe('Decks récupérés avec succès')
            expect(response.body.count).toBe(1)

            expect(response.body.decks.length).toBe(1)
            expect(response.body.decks[0].name).toBe('Mon Premier Deck')
            expect(prisma.deck.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: {userId: testUserId},
                })
            )
        })

        it('devrait retourner 401 si le token décodé ne contient pas userId (GET /mine)', async () => {
            vi.mocked(jwt.verify).mockReturnValueOnce({} as any)

            const response = await request(app)
                .get('/api/decks/mine')
                .set('Authorization', `Bearer some_token`)

            expect(response.status).toBe(401)
            expect(response.body.error).toBe('Utilisateur non authentifié')
        })

        it('devrait retourner 500 si une erreur serveur survient lors de la récupération (GET /mine)', async () => {
            vi.mocked(jwt.verify).mockReturnValueOnce({userId: testUserId, email: testUserEmail} as any)
            vi.mocked(prisma.deck.findMany).mockRejectedValue(new Error('db fail'))

            const response = await request(app)
                .get('/api/decks/mine')
                .set('Authorization', `Bearer ok`)

            expect(response.status).toBe(500)
            expect(response.body.error).toBe('Erreur serveur lors de la récupération des decks')
        })
// user pas connecter
        it('devrait retourner 401 si l utilisateur nest pas authentifié', async () => {
            const response = await request(app).get('/api/decks/mine')

            expect(response.status).toBe(401)
            expect(response.body.error).toBe('Token manquant')
        })
//pas de deck donc renvoie rien
        it('devrait retourner une liste vide si l utilisateur n a pas de decks', async () => {
            vi.mocked(prisma.deck.findMany).mockResolvedValue([])

            const response = await request(app)
                .get('/api/decks/mine')
                .set('Authorization', `Bearer ${validToken}`)

            expect(response.status).toBe(200)
            expect(response.body.count).toBe(0)
            expect(response.body.decks).toEqual([])
        })
    })
// retourne un seul deck 
    describe('READ - GET /api/decks/:id', () => {
        it('devrait récupérer un deck spécifique par ID', async () => {
            vi.mocked(prisma.deck.findUnique).mockResolvedValue(mockDeck as any)

            const response = await request(app)
                .get('/api/decks/1')
                .set('Authorization', `Bearer ${validToken}`)

            expect(response.status).toBe(200)
            expect(response.body.message).toBe('Deck récupéré avec succès')
            expect(response.body.deck.id).toBe(1)
            expect(response.body.deck.name).toBe('Mon Premier Deck')
            expect(response.body.deck.cards.length).toBe(10)
            expect(prisma.deck.findUnique).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: {id: 1},
                })
            )
        })

        it('devrait retourner 401 si le token décodé ne contient pas userId (GET /:id)', async () => {
            vi.mocked(jwt.verify).mockReturnValueOnce({} as any)

            const response = await request(app)
                .get('/api/decks/1')
                .set('Authorization', `Bearer some_token`)

            expect(response.status).toBe(401)
            expect(response.body.error).toBe('Utilisateur non authentifié')
        })

        it('devrait retourner 500 si une erreur serveur survient lors de la récupération (GET /:id)', async () => {
            vi.mocked(jwt.verify).mockReturnValueOnce({userId: testUserId, email: testUserEmail} as any)
            vi.mocked(prisma.deck.findUnique).mockRejectedValue(new Error('boom'))

            const response = await request(app)
                .get('/api/decks/1')
                .set('Authorization', `Bearer ok`)

            expect(response.status).toBe(500)
            expect(response.body.error).toBe('Erreur serveur lors de la récupération du deck')
        })
// user non connecter
        it('devrait retourner 401 si l utilisateur n est pas authentifié', async () => {
            const response = await request(app).get('/api/decks/1')

            expect(response.status).toBe(401)
            expect(response.body.error).toBe('Token manquant')
        })
// id invalide
        it('devrait retourner 400 si l ID du deck est invalide', async () => {
            const response = await request(app)
                .get('/api/decks/invalid')
                .set('Authorization', `Bearer ${validToken}`)

            expect(response.status).toBe(400)
            expect(response.body.error).toBe('ID de deck invalide')
        })
// pas de deck
        it('devrait retourner 404 si le deck n existe pas', async () => {
            vi.mocked(prisma.deck.findUnique).mockResolvedValue(null)

            const response = await request(app)
                .get('/api/decks/999')
                .set('Authorization', `Bearer ${validToken}`)

            expect(response.status).toBe(404)
            expect(response.body.error).toBe('Deck non trouvé')
        })
// pas acces au deck
        it('devrait retourner 403 si l utilisateur n est pas le propriétaire du deck', async () => {
            const otherUserDeck = {...mockDeck, userId: 2}
            vi.mocked(prisma.deck.findUnique).mockResolvedValue(otherUserDeck as any)

            const response = await request(app)
                .get('/api/decks/1')
                .set('Authorization', `Bearer ${validToken}`)

            expect(response.status).toBe(403)
            expect(response.body.error).toBe('Vous n avez pas accès à ce deck')
        })
    })
// mise a jour du deck
    describe('UPDATE - PATCH /api/decks/:id', () => {
// modification du nom
        it('devrait modifier le nom du deck', async () => {
            vi.mocked(prisma.deck.findUnique).mockResolvedValue(mockDeck as any)
            const updatedDeck = {...mockDeck, name: 'Deck Modifié'}
            vi.mocked(prisma.deck.update).mockResolvedValue(updatedDeck as any)

            const response = await request(app)
                .patch('/api/decks/1')
                .set('Authorization', `Bearer ${validToken}`)
                .send({name: 'Deck Modifié'})

            expect(response.status).toBe(200)
            expect(response.body.message).toBe('Deck modifié avec succès')
            expect(response.body.deck.name).toBe('Deck Modifié')
            expect(prisma.deck.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: {id: 1},
                    data: {name: 'Deck Modifié'},
                })
            )
        })
// modification des carte
        it('devrait modifier les cartes du deck', async () => {
            vi.mocked(prisma.deck.findUnique).mockResolvedValue(mockDeck as any)
            vi.mocked(prisma.card.findMany).mockResolvedValue(mockCards as any)
            vi.mocked(prisma.deckCard.deleteMany).mockResolvedValue({count: 10})
            vi.mocked(prisma.deckCard.createMany).mockResolvedValue({count: 10})
            const updatedDeck = {...mockDeck}
            vi.mocked(prisma.deck.update).mockResolvedValue(updatedDeck as any)

            const response = await request(app)
                .patch('/api/decks/1')
                .set('Authorization', `Bearer ${validToken}`)
                .send({cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]})

            expect(response.status).toBe(200)
            expect(response.body.message).toBe('Deck modifié avec succès')
            expect(prisma.deckCard.deleteMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: {deckId: 1},
                })
            )
            expect(prisma.deckCard.createMany).toHaveBeenCalled()
        })
// modification du nom et des cartes
        it('devrait modifier le nom et les cartes simultanément', async () => {
            vi.mocked(prisma.deck.findUnique).mockResolvedValue(mockDeck as any)
            vi.mocked(prisma.card.findMany).mockResolvedValue(mockCards as any)
            vi.mocked(prisma.deckCard.deleteMany).mockResolvedValue({count: 10})
            vi.mocked(prisma.deckCard.createMany).mockResolvedValue({count: 10})
            const updatedDeck = {...mockDeck, name: 'Deck Modifié'}
            vi.mocked(prisma.deck.update).mockResolvedValue(updatedDeck as any)

            const response = await request(app)
                .patch('/api/decks/1')
                .set('Authorization', `Bearer ${validToken}`)
                .send({
                    name: 'Deck Modifié',
                    cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
                })

            expect(response.status).toBe(200)
            expect(response.body.deck.name).toBe('Deck Modifié')
        })
// user non connecter
        it('devrait retourner 401 si l utilisateur n est pas authentifié', async () => {
            const response = await request(app)
                .patch('/api/decks/1')
                .send({name: 'Deck Modifié'})

            expect(response.status).toBe(401)
        })
// deck invalide
        it('devrait retourner 400 si l ID du deck est invalide', async () => {
            const response = await request(app)
                .patch('/api/decks/invalid')
                .set('Authorization', `Bearer ${validToken}`)
                .send({name: 'Deck Modifié'})

            expect(response.status).toBe(400)
            expect(response.body.error).toBe('ID de deck invalide')
        })
// pas de deck
        it('devrait retourner 404 si le deck n existe pas', async () => {
            vi.mocked(prisma.deck.findUnique).mockResolvedValue(null)

            const response = await request(app)
                .patch('/api/decks/999')
                .set('Authorization', `Bearer ${validToken}`)
                .send({name: 'Deck Modifié'})

            expect(response.status).toBe(404)
            expect(response.body.error).toBe('Deck non trouvé')
        })
// pas acces au deck 
        it('devrait retourner 403 si l utilisateur n est pas le propriétaire', async () => {
            const otherUserDeck = {...mockDeck, userId: 2}
            vi.mocked(prisma.deck.findUnique).mockResolvedValue(otherUserDeck as any)

            const response = await request(app)
                .patch('/api/decks/1')
                .set('Authorization', `Bearer ${validToken}`)
                .send({name: 'Deck Modifié'})

            expect(response.status).toBe(403)
            expect(response.body.error).toBe('Vous n avez pas accès à ce deck')
        })
// nom manquant
        it('devrait retourner 400 si le nom est vide', async () => {
            vi.mocked(prisma.deck.findUnique).mockResolvedValue(mockDeck as any)
            const response = await request(app)
                .patch('/api/decks/1')
                .set('Authorization', `Bearer ${validToken}`)
                .send({name: ''})

            expect(response.status).toBe(400)
            expect(response.body.error).toContain('chaîne non vide')
        })
// il n'a pas 10 caate
        it('devrait retourner 400 si les cartes ne sont pas exactement 10', async () => {
            vi.mocked(prisma.deck.findUnique).mockResolvedValue(mockDeck as any)
            const response = await request(app)
                .patch('/api/decks/1')
                .set('Authorization', `Bearer ${validToken}`)
                .send({cards: [1, 2, 3]})

            expect(response.status).toBe(400)
            expect(response.body.error).toContain('10 cartes')
        })

        it('devrait retourner 400 si les IDs des cartes sont invalides (PATCH)', async () => {
            vi.mocked(prisma.deck.findUnique).mockResolvedValue(mockDeck as any)

            const response = await request(app)
                .patch('/api/decks/1')
                .set('Authorization', `Bearer ${validToken}`)
                .send({cards: [1,2,3,4,5,6,7,8,9,'x']})

            expect(response.status).toBe(400)
            expect(response.body.error).toContain('nombres positifs')
        })

        it('devrait retourner 401 si le token décodé ne contient pas userId (PATCH)', async () => {
            // simulate token present but decoded without userId for PATCH
            vi.mocked(jwt.verify).mockReturnValueOnce({} as any)

            const response = await request(app)
                .patch('/api/decks/1')
                .set('Authorization', 'Bearer some_token')
                .send({name: 'Deck Modifié'})

            expect(response.status).toBe(401)
            expect(response.body.error).toBe('Utilisateur non authentifié')
        })

        it('devrait retourner 400 si certaines cartes sont manquantes en base (PATCH)', async () => {
            vi.mocked(prisma.deck.findUnique).mockResolvedValue(mockDeck as any)
            vi.mocked(prisma.card.findMany).mockResolvedValue([mockCards[0]] as any)

            const response = await request(app)
                .patch('/api/decks/1')
                .set('Authorization', `Bearer ${validToken}`)
                .send({cards: [1,2,3,4,5,6,7,8,9,10]})

            expect(response.status).toBe(400)
            expect(response.body.error).toContain('invalides ou manquantes')
        })

        it('devrait retourner 500 si une erreur serveur survient lors de la modification', async () => {
            vi.mocked(prisma.deck.findUnique).mockResolvedValue(mockDeck as any)
            vi.mocked(prisma.card.findMany).mockResolvedValue(mockCards as any)
            vi.mocked(prisma.deckCard.deleteMany).mockResolvedValue({count: 10})
            // forcer une erreur lors de l'update
            vi.mocked(prisma.deck.update).mockRejectedValue(new Error('DB error'))

            const response = await request(app)
                .patch('/api/decks/1')
                .set('Authorization', `Bearer ${validToken}`)
                .send({name: 'Deck Modifié'})

            expect(response.status).toBe(500)
            expect(response.body.error).toBe('Erreur serveur lors de la modification du deck')
        })
    })
// suprimer le deck 
    describe('DELETE - DELETE /api/decks/:id', () => {
        it('devrait supprimer un deck', async () => {
            vi.mocked(prisma.deck.findUnique).mockResolvedValue(mockDeck as any)
            vi.mocked(prisma.deckCard.deleteMany).mockResolvedValue({count: 10})
            vi.mocked(prisma.deck.delete).mockResolvedValue(mockDeck as any)

            const response = await request(app)
                .delete('/api/decks/1')
                .set('Authorization', `Bearer ${validToken}`)

            expect(response.status).toBe(200)
            expect(response.body.message).toBe('Deck supprimé avec succès')
            expect(response.body.deckId).toBe(1)
            expect(prisma.deckCard.deleteMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: {deckId: 1},
                })
            )
            expect(prisma.deck.delete).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: {id: 1},
                })
            )
        })
// use non connecter
        it('devrait retourner 401 si l utilisateur n est pas authentifié', async () => {
            const response = await request(app).delete('/api/decks/1')

            expect(response.status).toBe(401)
            expect(response.body.error).toBe('Token manquant')
        })
// deck invalide
        it('devrait retourner 400 si l ID du deck est invalide', async () => {
            const response = await request(app)
                .delete('/api/decks/invalid')
                .set('Authorization', `Bearer ${validToken}`)

            expect(response.status).toBe(400)
            expect(response.body.error).toBe('ID de deck invalide')
        })
// pas de deck
        it('devrait retourner 404 si le deck n existe pas', async () => {
            vi.mocked(prisma.deck.findUnique).mockResolvedValue(null)

            const response = await request(app)
                .delete('/api/decks/999')
                .set('Authorization', `Bearer ${validToken}`)

            expect(response.status).toBe(404)
            expect(response.body.error).toBe('Deck non trouvé')
        })
// pas acces au deck 
        it('devrait retourner 403 si l utilisateur n est pas le propriétaire', async () => {
            const otherUserDeck = {...mockDeck, userId: 2}
            vi.mocked(prisma.deck.findUnique).mockResolvedValue(otherUserDeck as any)

            const response = await request(app)
                .delete('/api/decks/1')
                .set('Authorization', `Bearer ${validToken}`)

            expect(response.status).toBe(403)
            expect(response.body.error).toBe('Vous n avez pas accès à ce deck')
        })

        it('devrait retourner 401 si le token décodé ne contient pas userId (DELETE)', async () => {
            vi.mocked(jwt.verify).mockReturnValueOnce({} as any)

            const response = await request(app)
                .delete('/api/decks/1')
                .set('Authorization', `Bearer some_token`)

            expect(response.status).toBe(401)
            expect(response.body.error).toBe('Utilisateur non authentifié')
        })

        it('devrait retourner 500 si une erreur serveur survient lors de la suppression (DELETE)', async () => {
            vi.mocked(jwt.verify).mockReturnValueOnce({userId: testUserId, email: testUserEmail} as any)
            vi.mocked(prisma.deck.findUnique).mockResolvedValue(mockDeck as any)
            vi.mocked(prisma.deckCard.deleteMany).mockResolvedValue({count: 10})
            vi.mocked(prisma.deck.delete).mockRejectedValue(new Error('boom'))

            const response = await request(app)
                .delete('/api/decks/1')
                .set('Authorization', `Bearer ok`)

            expect(response.status).toBe(500)
            expect(response.body.error).toBe('Erreur serveur lors de la suppression du deck')
        })

        it('devrait retourner 500 si une erreur serveur survient lors de la suppression', async () => {
            vi.mocked(prisma.deck.findUnique).mockResolvedValue(mockDeck as any)
            vi.mocked(prisma.deckCard.deleteMany).mockResolvedValue({count: 10})
            vi.mocked(prisma.deck.delete).mockRejectedValue(new Error('DB error'))

            const response = await request(app)
                .delete('/api/decks/1')
                .set('Authorization', `Bearer ${validToken}`)

            expect(response.status).toBe(500)
            expect(response.body.error).toBe('Erreur serveur lors de la suppression du deck')
        })
    })
})
