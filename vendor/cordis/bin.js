#!/usr/bin/env node

import { Context } from '@master-harness/cordis'
import { pathToFileURL } from 'node:url'
import Loader from '@master-harness/cordis-plugin-loader'

const ctx = new Context()
ctx.baseUrl = pathToFileURL(process.cwd()).href + '/'

await ctx.plugin(Loader)
await ctx.loader.create({
  name: '@master-harness/cordis-plugin-include',
  config: {
    path: './cordis.yml',
  },
})
