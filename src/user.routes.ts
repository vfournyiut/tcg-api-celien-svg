import { Request, Response, Router } from 'express'
import bcryptjs from 'bcryptjs'
import { prisma } from './database'
import { authenticateToken } from './auth/auth.middleware'

export const userRouter = Router()

/**
 * GET /users - Récupérer tous les utilisateurs
 * @returns {200} Array de tous les utilisateurs
 * @throws {500} Erreur serveur
 */
userRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany()
    res.status(200).json(users)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

/**
 * GET /users/:id - Récupérer un utilisateur par ID
 * @param {number} req.params.id - ID de l'utilisateur
 * @returns {200} Objet utilisateur
 * @throws {404} Utilisateur non trouvé
 * @throws {500} Erreur serveur
 */
userRouter.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
    })

    if (!user) {
      res.status(404).json({ error: 'Utilisateur non trouvé' })
      return
    }

    res.status(200).json(user)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

/**
 * POST /users - Créer un nouvel utilisateur (protégé)
 * Route accessible uniquement par un utilisateur authentifié
 * @param {string} req.body.username - Nom d'utilisateur
 * @param {string} req.body.email - Email de l'utilisateur
 * @param {string} req.body.password - Mot de passe (sera hashé)
 * @returns {201} Nouvel utilisateur créé
 * @throws {401} Utilisateur non authentifié
 * @throws {400} Erreur lors de la création
 * @throws {500} Erreur serveur
 */
userRouter.post('/', authenticateToken, async (req: Request, res: Response) => {
  const { username, email, password } = req.body

  try {
    const hashedPassword = await bcryptjs.hash(password, 10)

    const user = await prisma.user.create({
      data: { username, email, password: hashedPassword },
      select: {
        id: true,
        username: true,
        email: true,
      },
    })

    res.status(201).json({
      message: 'Utilisateur créé',
      user,
    })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})
