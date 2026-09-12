import { readFileSync } from 'node:fs'

const file = process.argv[2]
const prefix = process.argv[3]
const arr = JSON.parse(readFileSync(file, 'utf8'))
console.log(`${file}: ${arr.length}`)
const ids = arr.map((q) => q.id)
const seen = new Set()
const dup = []
for (const id of ids) {
  if (seen.has(id)) dup.push(id)
  seen.add(id)
}
console.log(`dup: ${dup.length} ${dup.join(',')}`)
const nums = ids
  .filter((id) => id.startsWith(prefix))
  .map((id) => Number(id.split('-')[2]))
  .sort((a, b) => a - b)
const gaps = []
for (let i = 1; i < nums.length; i++) {
  if (nums[i] !== nums[i - 1] + 1) gaps.push(`${nums[i - 1]}->${nums[i]}`)
}
console.log(
  `seq ${nums[0]}..${nums[nums.length - 1]} gaps: ${gaps.join(',') || 'nenhum'}`,
)
