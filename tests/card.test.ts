import {describe, it, expect, beforeEach, vi} from 'vitest'
import request from 'supertest'
import express from 'express'
import cardsRouter from '../src/cards/cards.route'
import {prisma} from '../src/database'

vi.mock('../src/database', () => ({
    prisma: {
        card: {
            findMany: vi.fn(),
        },
    },
}))

vi.mock('jsonwebtoken')
vi.mock('bcryptjs')

const app = express()
app.use(express.json())
app.use('/cards', cardsRouter)

describe('Cards Endpoints', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })
//retourne les cartes triées par pokedexNumber
    describe('GET /cards', () => {
        it('devrait retourner 200 et une liste de cartes triées par pokedexNumber', async () => {
            const mockCards = [
                {id: 1, name: 'Bulbasaur', pokedexNumber: 1},
                {id: 2, name: 'Ivysaur', pokedexNumber: 2},
                {id: 3, name: 'Venusaur', pokedexNumber: 3},
            ]

            vi.mocked(prisma.card.findMany).mockResolvedValue(mockCards as any)

            const response = await request(app).get('/cards')

            expect(response.status).toBe(200)
            expect(Array.isArray(response.body)).toBe(true)
            expect(response.body.length).toBe(3)
            expect(response.body[0].name).toBe('Bulbasaur')
            expect(vi.mocked(prisma.card.findMany)).toHaveBeenCalled()
        })
//ne retourne rein si les cartes n'ont pas étaais créer
        it('devrait retourner une liste vide si aucune carte n existe', async () => {
            vi.mocked(prisma.card.findMany).mockResolvedValue([])

            const response = await request(app).get('/cards')

            expect(response.status).toBe(200)
            expect(Array.isArray(response.body)).toBe(true)
            expect(response.body.length).toBe(0)
        })
// erreur serveur
        it('devrait gérer les erreurs serveur', async () => {
            vi.mocked(prisma.card.findMany).mockRejectedValue(
                new Error('Database error')
            )

            const response = await request(app).get('/cards')

            expect(response.status).toBe(500)
            expect(response.body.error).toBeDefined()
        })
    })
})