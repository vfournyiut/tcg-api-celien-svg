import { Request, Response, Router } from 'express'
import bcryptjs from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../database'
import { env } from '../env'

export const authRouter = Router()

/**
 * POST /sign-up - Créer un nouvel utilisateur
 * Enregistre un nouvel utilisateur avec email, username et password
 * @param {string} req.body.email - Email de l'utilisateur
 * @param {string} req.body.username - Nom d'utilisateur
 * @param {string} req.body.password - Mot de passe (sera hashé)
 * @returns {201} Utilisateur créé avec token JWT
 * @throws {400} Email, username ou password manquant
 * @throws {409} Email déjà utilisé
 * @throws {500} Erreur serveur
 */
authRouter.post('/sign-up', async (req: Request, res: Response) => {
    const {email, username, password} = req.body

    try {
        // 1. Valider les données
        if (!email || !username || !password) {
            return res.status(400).json({
                error: 'Email, username et password sont requis',
            })
        }


        // 2. Vérifier si l'email n'est pas déja utilisé
        const existingUserByEmail = await prisma.user.findUnique({
            where: {email},
        })

        if (existingUserByEmail) {
            return res.status(409).json({error: 'Email déjà utilisé'})
        }

        // 4. Hasher le mot de passe
        const hashedPassword = await bcryptjs.hash(password, 10)

        // 5. Créer l'utilisateur
        const user = await prisma.user.create({
            data: {
                email,
                username,
                password: hashedPassword,
            },
        })

        // 6. Génére le JWT
        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email,
            },
            env.JWT_SECRET,
            {expiresIn: '7d'}, // Le token expire dans 7 jours
        )

        // 7. Retourner le token et les infos utilisateur sans le mot dee passe
        return res.status(201).json({
            message: 'Inscription réussie',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
            },
        })
    } catch (error) {
        console.error('Erreur lors de l inscription:', error)
        return res.status(500).json({error: 'Erreur serveur lors de l inscription'})
    }

    // 2. Vérifier si l'email n'est pas déja utilisé
    const existingUserByEmail = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUserByEmail) {
      return res.status(409).json({ error: 'Email déjà utilisé' })
    }

    // 4. Hasher le mot de passe
    const hashedPassword = await bcryptjs.hash(password, 10)

    // 5. Créer l'utilisateur
    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
      },
    })

    // 6. Génére le JWT
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
      },
      env.JWT_SECRET,
      { expiresIn: '7d' }, // Le token expire dans 7 jours
    )

    // 7. Retourner le token et les infos utilisateur sans le mot dee passe
    return res.status(201).json({
      message: 'Inscription réussie',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    })
  } catch (error) {
    console.error("Erreur lors de l'inscription:", error)
    return res
      .status(500)
      .json({ error: "Erreur serveur lors de l'inscription" })
  }
})

/**
 * POST /sign-in - Connexion utilisateur
 * Authentifie un utilisateur et retourne un token JWT
 * @param {string} req.body.email - Email de l'utilisateur
 * @param {string} req.body.password - Mot de passe en clair
 * @returns {200} Utilisateur authentifié avec token JWT
 * @throws {400} Email ou password manquant
 * @throws {401} Email ou mot de passe incorrect
 * @throws {500} Erreur serveur
 */
authRouter.post('/sign-in', async (req: Request, res: Response) => {
  const { email, password } = req.body

  try {
    // 1. Valider les données
    if (!email || !password) {
      return res.status(400).json({ error: 'Email et password sont requis' })
    }

    // 2. Récupérer l'utilisateur par email
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' })
    }

    // 3. Vérifier le mot de passe
    const isPasswordValid = await bcryptjs.compare(password, user.password)

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' })
    }

    // 4. Générer le JWT
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
      },
      env.JWT_SECRET,
      { expiresIn: '7d' }, // Le token expire dans 7 jours
    )

    // 5. Retourner le token et les infos utilisateur
    return res.status(200).json({
      message: 'Connexion réussie',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    })
  } catch (error) {
    console.error('Erreur lors de la connexion:', error)
    return res
      .status(500)
      .json({ error: 'Erreur serveur lors de la connexion' })
  }
})
