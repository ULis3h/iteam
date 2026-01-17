/**
 * 角色技能文档同步服务
 * 在服务器启动时将角色配置同步到文档中心
 */

import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { generateRoleDocument, generateRoleTags, getDocumentAuthor } from './roleDocGenerator.js'
import logger from './logger.js'

/**
 * 同步所有角色技能文档到数据库
 */
export async function syncRoleDocuments(prisma: PrismaClient): Promise<void> {
  try {
    logger.info('🔄 Starting role skills documents synchronization...')

    // 读取角色配置文件
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = dirname(__filename)
    const rolesPath = join(__dirname, '../../config/roles.json')
    const rolesData = JSON.parse(readFileSync(rolesPath, 'utf-8'))

    let syncedCount = 0
    let createdCount = 0
    let updatedCount = 0

    for (const role of rolesData) {
      try {
        // 生成文档内容
        const content = generateRoleDocument(role)
        const tags = generateRoleTags(role)
        const author = getDocumentAuthor()
        const title = `${role.icon} ${role.name} Agent Skill`

        // 检查文档是否已存在（通过特殊的 title 格式识别）
        const existingDoc = await prisma.document.findFirst({
          where: {
            title: title,
            category: 'role-skill'
          }
        })

        if (existingDoc) {
          // 更新现有文档（如果内容有变化）
          if (existingDoc.content !== content) {
            await prisma.document.update({
              where: { id: existingDoc.id },
              data: {
                content,
                tags: JSON.stringify(tags),
                updatedAt: new Date()
              }
            })
            updatedCount++
            logger.info(`  ✅ Updated: ${title}`)
          } else {
            logger.info(`  ⏭️  Skipped: ${title} (no changes)`)
          }
        } else {
          // 创建新文档
          await prisma.document.create({
            data: {
              title,
              content,
              category: 'role-skill',
              tags: JSON.stringify(tags),
              author
            }
          })
          createdCount++
          logger.info(`  ✨ Created: ${title}`)
        }

        syncedCount++
      } catch (error) {
        logger.error(`  ❌ Failed to sync role: ${role.name}`, error)
      }
    }

    logger.info(`✅ Role skills sync completed:`)
    logger.info(`   Total: ${syncedCount}`)
    logger.info(`   Created: ${createdCount}`)
    logger.info(`   Updated: ${updatedCount}`)
    logger.info(`   Skipped: ${syncedCount - createdCount - updatedCount}`)
  } catch (error) {
    logger.error('❌ Failed to sync role skills documents:', error)
    // 不抛出错误，避免阻塞服务器启动
  }
}
