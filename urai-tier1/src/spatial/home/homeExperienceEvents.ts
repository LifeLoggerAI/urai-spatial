export const URAI_HOME_AVATAR_ACTIVATE_EVENT = 'urai:home-avatar-activate'

export function requestHomeAvatarActivation() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(URAI_HOME_AVATAR_ACTIVATE_EVENT))
}
