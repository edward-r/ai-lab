export const readFromStdin = async (): Promise<string | null> => {
  if (process.stdin.isTTY) {
    return null
  }

  const chunks: Buffer[] = []

  return await new Promise<string>((resolve, reject) => {
    process.stdin.on('data', (chunk: Buffer | string) => {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk, 'utf8') : chunk)
    })
    process.stdin.on('error', reject)
    process.stdin.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf8'))
    })
  })
}
