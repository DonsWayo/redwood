import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api'
import opentelemetry, { SpanStatusCode } from '@opentelemetry/api'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { Resource } from '@opentelemetry/resources'
import {
  NodeTracerProvider,
  BatchSpanProcessor,
} from '@opentelemetry/sdk-trace-node'
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions'
import ci from 'ci-info'
import envinfo from 'envinfo'
import system from 'systeminformation'
import { v4 as uuidv4 } from 'uuid'

import { name as packageName, version as packageVersion } from '../package'

/**
 * @type NodeTracerProvider
 */
let traceProvider

/**
 * @type BatchSpanProcessor
 */
let traceProcessor

/**
 * @type OTLPTraceExporter
 */
let traceExporter

export const UID = uuidv4()

export async function startTelemetry() {
  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.ERROR)

  // Resources
  const info = JSON.parse(
    await envinfo.run(
      {
        System: ['OS', 'Shell'],
        Binaries: ['Node', 'Yarn', 'npm'],
        npmPackages: '@redwoodjs/*',
        IDEs: ['VSCode'],
      },
      { json: true }
    )
  )

  // get shell name instead of path
  const shell = info.System?.Shell // Windows doesn't always provide shell info, I guess
  if (shell?.path?.match('/')) {
    info.System.Shell.name = info.System.Shell.path.split('/').pop()
  } else if (shell?.path.match('\\')) {
    info.System.Shell.name = info.System.Shell.path.split('\\').pop()
  }
  const cpu = await system.cpu()
  const mem = await system.mem()

  const isRedwoodCI = !!process.env.REDWOOD_CI
  const redwoodPRNumber = isRedwoodCI ? process.env.REDWOOD_CI_PR_NUMBER : undefined

  const resource = Resource.default().merge(
    new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: packageName,
      [SemanticResourceAttributes.SERVICE_VERSION]: packageVersion,
      [SemanticResourceAttributes.OS_TYPE]: info.System?.OS?.split(' ')[0],
      [SemanticResourceAttributes.OS_VERSION]: info.System?.OS?.split(' ')[1],
      'shell.name': info.System?.Shell?.name,
      'node.version': info.Binaries?.Node?.version,
      'yarn.version': info.Binaries?.Yarn?.version,
      'npm.version': info.Binaries?.npm?.version,
      'vscode.version': info.IDEs?.VSCode?.version,
      'cpu.count': cpu.physicalCores,
      'memory.gb': Math.round(mem.total / 1073741824),
      'env.node_env': process.env.NODE_ENV || null,
      'ci.redwood': isRedwoodCI,
      'ci.redwood.pr': redwoodPRNumber,
      'ci.isci': ci.isCI,
      uid: UID,
    })
  )

  // Tracing
  traceProvider = new NodeTracerProvider({
    resource: resource,
  })
  traceExporter = new OTLPTraceExporter({
    url:
      process.env.REDWOOD_REDIRECT_TELEMETRY ||
      'https://quark.quantumparticle.io/v1/traces',
  })
  traceProcessor = new BatchSpanProcessor(traceExporter)
  traceProvider.addSpanProcessor(traceProcessor)
  traceProvider.register()

  process.on('SIGTERM', async () => {
    await shutdownTelemetry()
  })
}

export async function shutdownTelemetry() {
  try {
    opentelemetry.trace.getActiveSpan()?.end()
    await traceProvider?.shutdown()
    await traceProcessor?.shutdown()
    await traceExporter?.shutdown()
  } catch (error) {
    console.error('Telemetry error')
    console.error(error)
  }
}

export function recordErrorViaTelemetry(error) {
  opentelemetry.trace.getActiveSpan()?.setStatus({
    code: SpanStatusCode.ERROR,
    message: error.toString().split('\n')[0],
  })
  opentelemetry.trace.getActiveSpan()?.recordException(error)
}
