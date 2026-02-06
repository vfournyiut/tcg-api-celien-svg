import {describe, it, expect, beforeEach, vi} from 'vitest'
import request from 'supertest'
import express from 'express'
import {authRouter} from '../src/auth/auth.route'
import {prismaMock} from './vitest.setup'
import bcryptjs from 'bcryptjs'
import jwt from 'jsonwebtoken'

const app = express()
app.use(express.json())
app.use('/auth', authRouter)

vi.mock('jsonwebtoken', () => ({
    default: {
        sign: vi.fn(),
        verify: vi.fn(),
    },
}))

vi.mock('bcryptjs', () => ({
    default: {
        hash: vi.fn(),
        compare: vi.fn(),
    },
}))

describe('Authentication Endpoints', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })
// créer un nouvel utilisateur
    describe('POST /auth/sign-up', () => {
        it('dois retourner 201 et créer un nouvel utilisateur avec un token valide', async () => {
            const newUser = {
                email: 'test@example.com',
                username: 'testuser',
                password: 'password123',
            }

            const hashedPassword = 'hashed_password'
            const mockToken = 'mock_jwt_token'

            prismaMock.user.findUnique.mockResolvedValue(null)
            vi.mocked(bcryptjs.hash).mockResolvedValue(hashedPassword as never)
            prismaMock.user.create.mockResolvedValue({
                id: '1',
                email: newUser.email,
                username: newUser.username,
                password: hashedPassword,
                createdAt: new Date(),
                updatedAt: new Date(),
            })
            vi.mocked(jwt.sign).mockReturnValue(mockToken as never)

            const response = await request(app)
                .post('/auth/sign-up')
                .send(newUser)

            expect(response.status).toBe(201)
            expect(response.body).toEqual({
                message: 'Inscription réussie',
                token: mockToken,
                user: {
                    id: '1',
                    username: newUser.username,
                    email: newUser.email,
                },
            })
            expect(prismaMock.user.create).toHaveBeenCalled()
            expect(vi.mocked(jwt.sign)).toHaveBeenCalled()
        })
// email , username ou mot d epasse manquant
        it('dois retourner 400 si email, username ou password est manquant', async () => {
            const invalidUsers = [
                {email: 'test@example.com', username: 'testuser'}, // password manquant
                {email: 'test@example.com', password: 'password123'}, // username manquant
                {username: 'testuser', password: 'password123'}, // email manquant
            ]

            for (const user of invalidUsers) {
                const response = await request(app)
                    .post('/auth/sign-up')
                    .send(user)

                expect(response.status).toBe(400)
                expect(response.body.error).toBe('Email, username et password sont requis')
            }
        })
// email déja utilisé
        it('dois retourner 409 si email est déjà utilisé', async () => {
            const newUser = {
                email: 'existing@example.com',
                username: 'testuser',
                password: 'password123',
            }

            prismaMock.user.findUnique.mockResolvedValue({
                id: '2',
                email: newUser.email,
                username: 'existinguser',
                password: 'hashed_password',
                createdAt: new Date(),
                updatedAt: new Date(),
            })

            const response = await request(app)
                .post('/auth/sign-up')
                .send(newUser)

            expect(response.status).toBe(409)
            expect(response.body.error).toBe('Email déjà utilisé')
        })
// erreur serveur
        it('dois retourner 500 en cas d erreur serveur', async () => {
            const newUser = {
                email: 'test@example.com',
                username: 'testuser',
                password: 'password123',
            }

            prismaMock.user.findUnique.mockRejectedValue(new Error('Database error'))

            const response = await request(app)
                .post('/auth/sign-up')
                .send(newUser)

            expect(response.status).toBe(500)
            expect(response.body.error).toBe('Erreur serveur lors de l inscription')
        })
    })
// la conexion
// la conesxion est corecte
    describe('POST /auth/sign-in', () => {
        it('dois retourner 200 et un token valide pour un utilisateur existant avec mot de passe correct', async () => {
            const credentials = {
                email: 'test@example.com',
                password: 'password123',
            }

            const mockUser = {
                id: '1',
                email: credentials.email,
                username: 'testuser',
                password: 'hashed_password',
                createdAt: new Date(),
                updatedAt: new Date(),
            }

            const mockToken = 'mock_jwt_token'

            prismaMock.user.findUnique.mockResolvedValue(mockUser)
            vi.mocked(bcryptjs.compare).mockResolvedValue(true as never)
            vi.mocked(jwt.sign).mockReturnValue(mockToken as never)

            const response = await request(app)
                .post('/auth/sign-in')
                .send(credentials)

            expect(response.status).toBe(200)
            expect(response.body).toEqual({
                message: 'Connexion réussie',
                token: mockToken,
                user: {
                    id: mockUser.id,
                    username: mockUser.username,
                    email: mockUser.email,
                },
            })
            expect(vi.mocked(bcryptjs.compare)).toHaveBeenCalledWith(credentials.password, mockUser.password)
            expect(vi.mocked(jwt.sign)).toHaveBeenCalled()
        })
// email ou mdp manquant
        it('dois retourner 400 si email ou password est manquant', async () => {
            const invalidCredentials = [
                {email: 'test@example.com'}, // password manquant
                {password: 'password123'}, // email manquant
            ]

            for (const credentials of invalidCredentials) {
                const response = await request(app)
                    .post('/auth/sign-in')
                    .send(credentials)

                expect(response.status).toBe(400)
                expect(response.body.error).toBe('Email et password sont requis')
            }
        })
// user inexistant
        it('dois retourner 401 si utilisateur n existe pas', async () => {
            const credentials = {
                email: 'nonexistent@example.com',
                password: 'password123',
            }

            prismaMock.user.findUnique.mockResolvedValue(null)

            const response = await request(app)
                .post('/auth/sign-in')
                .send(credentials)

            expect(response.status).toBe(401)
            expect(response.body.error).toBe('Email ou mot de passe incorrect')
        })
// mdp incorect
        it('dois retourner 401 si mot de passe est incorrect', async () => {
            const credentials = {
                email: 'test@example.com',
                password: 'wrongpassword',
            }

            const mockUser = {
                id: '1',
                email: credentials.email,
                username: 'testuser',
                password: 'hashed_password',
                createdAt: new Date(),
                updatedAt: new Date(),
            }

            prismaMock.user.findUnique.mockResolvedValue(mockUser)
            vi.mocked(bcryptjs.compare).mockResolvedValue(false as never)

            const response = await request(app)
                .post('/auth/sign-in')
                .send(credentials)

            expect(response.status).toBe(401)
            expect(response.body.error).toBe('Email ou mot de passe incorrect')
        })
// erreur serveur
        it('dois retourner 500 en cas d erreur serveur', async () => {
            const credentials = {
                email: 'test@example.com',
                password: 'password123',
            }

            prismaMock.user.findUnique.mockRejectedValue(new Error('Database error'))

            const response = await request(app)
                .post('/auth/sign-in')
                .send(credentials)

            expect(response.status).toBe(500)
            expect(response.body.error).toBe('Erreur serveur lors de la connexion')
        })
    })
})
