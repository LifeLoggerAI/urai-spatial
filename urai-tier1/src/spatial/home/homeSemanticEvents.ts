export const URAI_HOME_AVATAR_ACTIVATE_EVENT = 'urai:home-avatar-activate'

export function requestHomeAvatarActivation() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(URAI_HOME_AVATAR_ACTIVATE_EVENT))
}

declare global {
  interface WindowEventMap {
    [URAI_HOME_AVATAR_ACTIVATE_EVENT]: Event
  }
}
