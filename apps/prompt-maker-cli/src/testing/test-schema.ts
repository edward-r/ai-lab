import { z } from 'zod'

export const PromptTestSchema = z.object({
  name: z.string().min(1, 'Test name is required'),
  intent: z.string().min(1, 'Intent text is required'),
  context: z.array(z.string().min(1)).default([]),
  image: z.array(z.string()).optional(),
  video: z.array(z.string()).optional(),
  smartContext: z.boolean().optional(),
  smartContextRoot: z.string().min(1).optional(),
  expect: z.array(z.string().min(1)).min(1, 'Each test must include at least one expectation'),
})

export const PromptTestSuiteSchema = z.object({
  tests: z.array(PromptTestSchema).min(1, 'Provide at least one test case'),
})

export type PromptTest = z.infer<typeof PromptTestSchema>
export type PromptTestSuite = z.infer<typeof PromptTestSuiteSchema>

export const parsePromptTestSuite = (data: unknown): PromptTestSuite => {
  return PromptTestSuiteSchema.parse(data)
}
