      {debugOpen && !runtimeFlags.publicDemoMode && !runtimeFlags.recordingMode && (
        <div
          style={{
            position: 'absolute',
            left: 16,
            bottom: 16,
            zIndex: 30,
            padding: 10,
            borderRadius: 12,
            background: 'rgba(0,0,0,.65)',
            fontSize: 12,
            color: '#d2e8ff',
            pointerEvents: 'auto',
          }}
        >
          phase={phase}
          <br />
          selected={selectedStarId ?? 'none'}
          <br />
          starCount={lifeMap.stars.length}
          <br />
          camera={phase}
          <br />
          source={source}
          <br />
          gates={String(canUsePersonalLifeMap)}/{String(canUsePersonalMemoryStars)}/
          {String(canUseAdvancedReplay)}
        </div>
      )}