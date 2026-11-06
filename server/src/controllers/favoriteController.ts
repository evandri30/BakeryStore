import type { RequestHandler } from 'express'
import { addFavorite, listFavorites, removeFavorite } from '../favorites.js'
import { currentUserId } from '../middlewares/auth.js'

// GET /api/favorite: product ids, newest first
export const list: RequestHandler = async (req, res) => {
  res.json({ success: true, productIds: await listFavorites(currentUserId(req)) })
}

// PUT /api/favorite/:productId
export const add: RequestHandler = async (req, res) => {
  await addFavorite(currentUserId(req), String(req.params.productId))
  res.json({ success: true })
}

// DELETE /api/favorite/:productId
export const remove: RequestHandler = async (req, res) => {
  await removeFavorite(currentUserId(req), String(req.params.productId))
  res.json({ success: true })
}
