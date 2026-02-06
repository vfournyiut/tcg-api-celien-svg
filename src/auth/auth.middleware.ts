import {NextFunction, Request, Response} from 'express'
import jwt from 'jsonwebtoken'
import {env} from '../env'

/**
 * Middleware d'authentification JWT
 * Vérifie la validité du token JWT dans l'en-tête Authorization et injecte les données utilisateur
 * @param {Request} req - Objet requête Express contenant l'en-tête Authorization
 * @param {Response} res - Objet réponse Express
 * @param {NextFunction} next - Fonction pour passer au middleware suivant
 * @throws {401} Token manquant
 * @throws {401} Token invalide
 * @throws {401} Token expiré
 * @throws {401} Authentification échouée
 */
export const authenticateToken = (
    req: Request,
    res: Response,
    next: NextFunction,
): void => {
    // 1. Récupérer le token depuis l'ennp-tête Authorization
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(' ')[1] // Format: "Bearer TOKEN"

    if (!token) {
        res.status(401).json({error: 'Token manquant'})
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
        const errorName = (error as any).name || ''
        
        if (errorName === 'TokenExpiredError') {
            res.status(401).json({error: 'Token expiré'})
        } else if (errorName === 'JsonWebTokenError') {
            res.status(401).json({error: 'Token invalide'})
        } else {
            res.status(401).json({error: 'Authentification échouée'})
        }
    }
}
