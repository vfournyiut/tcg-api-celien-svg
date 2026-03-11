import { Request, Response, Router } from 'express'
import bcryptjs from 'bcryptjs'
import { prisma } from './database'
import { authenticateToken } from './auth/auth.middleware'

export const userRouter = Router()

// GET: Récupérer tous les utilisateurs
// Accessible via GET /users
userRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany()
    res.status(200).json(users)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// GET: Récupérer un utilisateur par ID
// Accessible via GET /users/:id
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

// Route protégée : seuls les utilisateurs authentifiés peuvent créer un utilisateur
// Accessible via POST /users
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
