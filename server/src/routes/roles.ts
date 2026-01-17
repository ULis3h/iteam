import { Router } from 'express'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const router = Router()

// 读取角色配置文件
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rolesPath = join(__dirname, '../../config/roles.json')
let rolesData: any[] = []

try {
  const data = readFileSync(rolesPath, 'utf-8')
  rolesData = JSON.parse(data)
  console.log(`✅ Loaded ${rolesData.length} role configurations`)
} catch (error) {
  console.error('❌ Failed to load roles.json:', error)
  rolesData = []
}

// Get all roles
router.get('/', (req, res) => {
  try {
    res.json(rolesData)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch roles' })
  }
})

// Get role by ID
router.get('/:roleId', (req, res) => {
  try {
    const { roleId } = req.params
    const role = rolesData.find(r => r.roleId === roleId)

    if (!role) {
      return res.status(404).json({ error: 'Role not found' })
    }

    res.json(role)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch role' })
  }
})

export default router
