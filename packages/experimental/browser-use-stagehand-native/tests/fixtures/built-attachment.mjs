/** Plain-Node smoke of the published provider and its independently configured attachment Worker. */
import { Context } from '@master-harness/cordis'
import { mountAgentLoopTestDependencies, mountAgentLoopTestHarness } from '@master-harness/agent-loop-testkit'
import BrowserUseRegistry from '@master-harness/browser-use'
import { ToolCallId } from '@master-harness/llm'
import { SessionId } from '@master-harness/session'
import { executeModelToolFixture } from '@master-harness/tool-testkit'
import * as Provider from '../../lib/index.js'

const [endpoint, url] = process.argv.slice(2)
const ctx = new Context()
try {
  await mountAgentLoopTestDependencies(ctx)
  await ctx.plugin(BrowserUseRegistry)
  const provider = ctx.plugin(Provider, {
    mode: 'attach', cdpEndpoint: endpoint,
    model: { modelName: 'openai/gpt-5.4-mini', apiKey: 'offline-browser-smoke' },
  })
  await provider
  const harness = await mountAgentLoopTestHarness(ctx)
  const agent = await harness.create(SessionId('built-stagehand'))
  const call = async (method, args) => {
    const result = await executeModelToolFixture(ctx, { agent, name: `stagehand_${method}`, arguments: args, callId: ToolCallId(`built-${method}`), signal: new AbortController().signal })
    if (result.isError) throw new Error(JSON.stringify(result.content))
    return result
  }
  await call('tabs', { action: 'new', url })
  const result = await call('navigate', { url })
  await provider.dispose()
  process.stdout.write(JSON.stringify({ result: result.content }) + '\n')
} finally {
  await ctx.fiber.dispose()
}
