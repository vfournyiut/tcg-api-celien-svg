import { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../env'

export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  // 1. Récupérer le token depuis l'en-tête Authorization
  const authHeader = req.headers.authorization
  const token = authHeader && authHeader.split(' ')[1] // Format: "Bearer TOKEN"

  if (!token) {
    res.status(401).json({ error: 'Token manquant' })
    return
  }

  try {
    // 2. Vérifier et décoder le token
    const decoded = jwt.verify(token, env.JWT_SECRET) as {
      userId: number
      email: string
    }

    // 3. Injecter userId et email dans req.user pour les routes protégées
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
    }

    // 4. Passer au prochain middleware ou à la route
    next()
  } catch (error) {
    // Gérer les erreurs de token
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expiré' })
    } else if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Token invalide' })
    } else {
      res.status(401).json({ error: 'Authentification échouée' })
    }
  }
}
