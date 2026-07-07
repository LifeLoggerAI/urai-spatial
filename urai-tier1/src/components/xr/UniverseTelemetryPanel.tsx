type UniverseTelemetryPanelProps = {
  state?: unknown
}

export default function UniverseTelemetryPanel({ state }: UniverseTelemetryPanelProps) {
  const serialized = (() => {
    try {
      return JSON.stringify(state ?? {}, null, 2).slice(0, 360)
    } catch {
      return 'telemetry unavailable'
    }
  })()

  return (
    <group>
      {/* Runtime telemetry fallback for launch verification. Visual telemetry remains provider-gated. */}
      <mesh position={[0, -2.8, 0]} visible={false} userData={{ telemetry: serialized }} />
    </group>
  )
}
