import { Router } from 'express'
import { PrismaClient } from '@prisma/client'

const router = Router()
const prisma = new PrismaClient()

// Get all documents
router.get('/', async (req, res) => {
  try {
    const { category, search } = req.query

    const where: any = {}

    if (category && category !== 'all') {
      where.category = category
    }

    if (search) {
      where.OR = [
        { title: { contains: search as string } },
        { content: { contains: search as string } },
        { tags: { contains: search as string } },
      ]
    }

    const documents = await prisma.document.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    // Parse tags from JSON string
    const documentsWithParsedTags = documents.map((doc) => ({
      ...doc,
      tags: doc.tags ? JSON.parse(doc.tags) : [],
    }))

    res.json(documentsWithParsedTags)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch documents' })
  }
})

// Get document by ID
router.get('/:id', async (req, res) => {
  try {
    const document = await prisma.document.findUnique({
      where: { id: req.params.id },
    })

    if (!document) {
      return res.status(404).json({ error: 'Document not found' })
    }

    res.json({
      ...document,
      tags: document.tags ? JSON.parse(document.tags) : [],
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch document' })
  }
})

// Create document
router.post('/', async (req, res) => {
  try {
    const document = await prisma.document.create({
      data: {
        title: req.body.title,
        content: req.body.content,
        category: req.body.category,
        tags: JSON.stringify(req.body.tags || []),
        author: req.body.author,
      },
    })

    res.status(201).json({
      ...document,
      tags: JSON.parse(document.tags),
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to create document' })
  }
})

// Update document
router.put('/:id', async (req, res) => {
  try {
    const document = await prisma.document.update({
      where: { id: req.params.id },
      data: {
        title: req.body.title,
        content: req.body.content,
        category: req.body.category,
        tags: req.body.tags ? JSON.stringify(req.body.tags) : undefined,
      },
    })

    res.json({
      ...document,
      tags: JSON.parse(document.tags),
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to update document' })
  }
})

// Delete document
router.delete('/:id', async (req, res) => {
  try {
    await prisma.document.delete({
      where: { id: req.params.id },
    })
    res.status(204).send()
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete document' })
  }
})

export default router
