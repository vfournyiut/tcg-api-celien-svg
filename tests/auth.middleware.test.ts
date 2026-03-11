import {describe, it, expect, beforeEach, vi, afterEach} from 'vitest'
import request from 'supertest'
import express, {Response} from 'express'
import {authenticateToken} from '../src/auth/auth.middleware'
import jwt from 'jsonwebtoken'

// Créer une classe JsonWebTokenError réelle pour les tests
class JsonWebTokenError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'JsonWebTokenError'
    }
}

class TokenExpiredError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'TokenExpiredError'
        Object.setPrototypeOf(this, TokenExpiredError.prototype)
    }
}

// Assigner le prototype pour que instanceof fonctionne
Object.setPrototypeOf(JsonWebTokenError.prototype, Error.prototype)

vi.mock('jsonwebtoken')

const app = express()
app.use(express.json())

// Route de test protégée
app.get('/protected', authenticateToken, (req: any, res: Response) => {
    res.status(200).json({message: 'Accès autorisé', user: req.user})
})

const SECRET_KEY = process.env.JWT_SECRET || 'test_secret'

describe('Authentication Middleware', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    afterEach(() => {
        vi.resetAllMocks()
    })
// verifie la présence du token 
    describe('Token manquant', () => {
        it('devrait retourner 401 si le token est manquant', async () => {
            const response = await request(app).get('/protected')

            expect(response.status).toBe(401)
            expect(response.body).toEqual({error: 'Token manquant'})
        })
    })
// verifie que le tokent est correct
    describe('Token invalide', () => {
        it('devrait retourner 401 si le token est invalide', async () => {
            // Créer une vraie instance de JsonWebTokenError
            const error = new JsonWebTokenError('invalid token')
            
            vi.mocked(jwt.verify).mockImplementation(() => {
                throw error
            })

            const response = await request(app)
                .get('/protected')
                .set('Authorization', 'Bearer invalid_token')

            expect(response.status).toBe(401)
            expect(response.body.error).toContain('invalide')
        })
    })
// valide le token si tout est correct
    describe('Token valide', () => {
        it('devrait permettre l accès avec un token valide', async () => {
            const validToken = 'valid_token'
            const decodedUser = {userId: 1, email: 'test@example.com'}

            vi.mocked(jwt.verify).mockReturnValue(decodedUser as any)

            const response = await request(app)
                .get('/protected')
                .set('Authorization', `Bearer ${validToken}`)

            expect(response.status).toBe(200)
            expect(response.body.message).toBe('Accès autorisé')
            expect(response.body.user).toEqual(decodedUser)
            expect(jwt.verify).toHaveBeenCalledWith(validToken, expect.any(String))
        })
    })
// verifie le format du token
    describe('Format du token', () => {
        it('devrait retourner 401 si le format du token est incorrect', async () => {
            const response = await request(app)
                .get('/protected')
                .set('Authorization', 'InvalidFormat token')

            expect(response.status).toBe(401)
            expect(response.body.error).toBe('Authentification échouée')
        })

        it('devrait accepter un token avec le préfixe Bearer', async () => {
            const validToken = 'valid_token'
            const decodedUser = {userId: 2, email: 'user@example.com'}

            vi.mocked(jwt.verify).mockReturnValue(decodedUser as any)

            const response = await request(app)
                .get('/protected')
                .set('Authorization', `Bearer ${validToken}`)

            expect(response.status).toBe(200)
            expect(jwt.verify).toHaveBeenCalled()
        })
    })
// verifie que la date du token est encore bonne
    describe('Token expiré', () => {
        it('devrait retourner 401 si le token est expiré', async () => {
            const error = new TokenExpiredError('Token expiré')
            
            vi.mocked(jwt.verify).mockImplementation(() => {
                throw error
            })

            const response = await request(app)
                .get('/protected')
                .set('Authorization', 'Bearer expired_token')

            expect(response.status).toBe(401)
        })
    })

    describe('Erreur inconnue du token', () => {
        it('devrait retourner 401 et message générique si une erreur non JWT est levée', async () => {
            const error = new Error('some unexpected error')

            vi.mocked(jwt.verify).mockImplementation(() => {
                throw error
            })

            const response = await request(app)
                .get('/protected')
                .set('Authorization', 'Bearer weird_token')

            expect(response.status).toBe(401)
            expect(response.body.error).toBe('Authentification échouée')
        })
    })
})
