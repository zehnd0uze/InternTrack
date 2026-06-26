import fs from 'fs'
import path from 'path'

const walkSync = (dir, filelist = []) => {
  fs.readdirSync(dir).forEach(file => {
    const dirFile = path.join(dir, file)
    try {
      filelist = walkSync(dirFile, filelist)
    } catch (err) {
      if (err.code === 'ENOTDIR' || err.code === 'EBADF') filelist.push(dirFile)
    }
  })
  return filelist
}

const files = walkSync('./src').filter(f => f.endsWith('.jsx'))

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8')
  
  // replace bg-white -> bg-card
  content = content.replace(/bg-white(?!\/)/g, 'bg-card')
  // replace text-gray-900 -> text-content
  content = content.replace(/text-gray-900/g, 'text-content')
  // replace text-gray-800 -> text-content
  content = content.replace(/text-gray-800/g, 'text-content')
  // replace text-gray-700 -> text-content-muted
  content = content.replace(/text-gray-700/g, 'text-content-muted')
  // replace text-gray-600 -> text-content-muted
  content = content.replace(/text-gray-600/g, 'text-content-muted')
  // replace text-gray-500 -> text-content-muted
  content = content.replace(/text-gray-500/g, 'text-content-muted')
  // replace bg-gray-50 -> bg-background
  content = content.replace(/bg-gray-50(?!\/)/g, 'bg-background')
  // replace bg-gray-100 -> bg-surface-hover
  content = content.replace(/bg-gray-100(?!\/)/g, 'bg-surface-hover')
  // replace border-gray-200 -> border-border
  content = content.replace(/border-gray-200(?!\/)/g, 'border-border')
  // replace border-gray-100 -> border-border
  content = content.replace(/border-gray-100(?!\/)/g, 'border-border-light')

  // wait, what about text-white inside buttons?
  // bg-white/20 is skipped by (?!\/)

  fs.writeFileSync(file, content)
})

console.log('Refactoring complete')
