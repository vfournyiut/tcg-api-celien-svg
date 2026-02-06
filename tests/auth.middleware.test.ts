import {describe, it, expect, beforeEach, vi} from 'vitest'
import request from 'supertest'
import express from 'express'
import {authenticateToken} from '../src/auth/auth.middleware'
import {prismaMock} from './vitest.setup'
import bcryptjs from 'bcryptjs'
import jwt from 'jsonwebtoken'


const app = express()
app.use(express.json())
app.use('/auth', authenticateToken)

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