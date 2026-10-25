import * as NativeToolExecutor from '@master-harness/tool-executor-native'
import { Context } from '@master-harness/cordis'
import { afterEach, describe, expect, it } from 'vitest'
import ToolRuntime from '@master-harness/tools'
import SystemPrompt from '@master-harness/system-prompt'
import UserQuestionService from '@master-harness/user-questions'
import { apply } from '../src/index.ts'

let ctx: Context | undefined

afterEach(async () => {
  await ctx?.fiber.dispose()
  ctx = undefined
})

describe('ui-user-questions node plugin', () => {
  it('mounts no model-facing tool', async () => {
    ctx = new Context()
    await ctx.plugin(SystemPrompt)
    await ctx.plugin(ToolRuntime)
    await ctx.plugin(NativeToolExecutor)
    await ctx.plugin(UserQuestionService)

    await ctx.plugin({ apply }).await()

    // Host UI registration must leave each preset's model-facing tool list intact.
    expect(ctx.tools.get('ask_user_question')).toBeUndefined()
  })
})
