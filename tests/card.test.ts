import {describe, it, expect, beforeEach, vi} from 'vitest'
import request from 'supertest'
import express from 'express'
import cardsRouter from '../src/cards/cards.route'
import {prismaMock} from './vitest.setup'
import { v1 } from 'uuid'



const app = express()
app.use(express.json())
app.use('/cards', cardsRouter)

v1.mock('jsonwebtoken', () => ({
    default: {
        sign: vi.fn(),
        verify: vi.fn(),
    },
}))

v1.mock('bcryptjs', () => ({
    default: {
        hash: vi.fn(),
        compare: vi.fn(),
    },
}))

describe('Authentication Endpoints', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })
//methode de récupératioon de toutes les cartes
    describe('GET /cards', () => {
        it('dois retourner 200 et une liste de cartes triées par pokedexNumber', async () => {
            const mockCards = [
                { id: '1', name: 'Bulbasaur', pokedexNumber: 1 },
                { id: '2', name: 'Ivysaur', pokedexNumber: 2 },
                { id: '3', name: 'Venusaur', pokedexNumber: 3 },
            ]
            prismaMock.card.findMany.mockResolvedValue(mockCards)

            const response = await request(app).get('/cards')
        })
    })
})