import GroundMovementAccessibilityStatus from './GroundMovementAccessibilityStatus'
import HomeSpatialRuntimeLayer from './HomeSpatialRuntimeLayer'
import './spatial-runtime-restoration.css'
import './continuous-spatial-proof-defects.css'
import './premium-spatial-atmosphere.css'
import './home-provider-preview-composition.css'

/**
 * Global spatial shell.
 *
 * Home is a cinematic threshold, not a locomotion surface. Ground owns
 * first-person movement controls; Home retains semantic destination controls
 * inside HomeSpatialRuntimeLayer for keyboard and assistive technology.
 */
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return (
    <>
      <HomeSpatialRuntimeLayer />
      <GroundMovementAccessibilityStatus />
      {children}
    </>
  )
}
