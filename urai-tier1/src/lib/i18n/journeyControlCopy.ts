import { localizedMessage, type LocalePreference } from './localePreference'
import type { UraiMessageId } from './locales'

export type ReplayStatus = {id: UraiMessageId; count?: number; action?: UraiMessageId; detail?: string}

export function replayActionCopy(preference: LocalePreference, id: UraiMessageId) {
  switch(id) {
    case 'replay.operationSave': return localizedMessage(preference,'replay.operationSave')
    case 'replay.operationHide': return localizedMessage(preference,'replay.operationHide')
    case 'replay.operationRestore': return localizedMessage(preference,'replay.operationRestore')
    case 'replay.operationCorrect': return localizedMessage(preference,'replay.operationCorrect')
    default: throw new Error('UNREGISTERED_REPLAY_OPERATION_LABEL')
  }
}

export function replayHistoryCopy(preference: LocalePreference, id: UraiMessageId) {
  switch(id) {
    case 'replay.savedHistory': return localizedMessage(preference,'replay.savedHistory')
    case 'replay.restoredHistory': return localizedMessage(preference,'replay.restoredHistory')
    case 'replay.hiddenHistory': return localizedMessage(preference,'replay.hiddenHistory')
    case 'replay.correctedHistory': return localizedMessage(preference,'replay.correctedHistory')
    default: throw new Error('UNREGISTERED_REPLAY_HISTORY_LABEL')
  }
}

export function replayStatusCopy(preference: LocalePreference, status: ReplayStatus) {
  let copy: ReturnType<typeof localizedMessage>
  switch(status.id) {
    case 'replay.demoReadOnly': copy=localizedMessage(preference,'replay.demoReadOnly'); break
    case 'replay.ready': copy=localizedMessage(preference,'replay.ready'); break
    case 'replay.ownerRequired': copy=localizedMessage(preference,'replay.ownerRequired'); break
    case 'replay.waitingChanges': copy=localizedMessage(preference,'replay.waitingChanges'); break
    case 'replay.synchronized': copy=localizedMessage(preference,'replay.synchronized'); break
    case 'replay.historyUnavailable': copy=localizedMessage(preference,'replay.historyUnavailable'); break
    case 'replay.retryingChanges': copy=localizedMessage(preference,'replay.retryingChanges'); break
    case 'replay.attentionChanges': copy=localizedMessage(preference,'replay.attentionChanges'); break
    case 'replay.allSynchronized': copy=localizedMessage(preference,'replay.allSynchronized'); break
    case 'replay.demoCannotChange': copy=localizedMessage(preference,'replay.demoCannotChange'); break
    case 'replay.queuedOffline': copy=localizedMessage(preference,'replay.queuedOffline'); break
    case 'replay.savingOperation': copy=localizedMessage(preference,'replay.savingOperation'); break
    case 'replay.failedOperation': copy=localizedMessage(preference,'replay.failedOperation'); break
    case 'replay.restored': copy=localizedMessage(preference,'replay.restored'); break
    case 'replay.hidden': copy=localizedMessage(preference,'replay.hidden'); break
    case 'replay.savedStatus': copy=localizedMessage(preference,'replay.savedStatus'); break
    case 'replay.correctionSaved': copy=localizedMessage(preference,'replay.correctionSaved'); break
    default: throw new Error('UNREGISTERED_REPLAY_STATUS')
  }
  const valuePreference: LocalePreference=copy.locale===preference.requested ? preference : {requested:copy.locale,preview:false}
  const values: Record<string,string>={...(status.count === undefined ? {} : {count:new Intl.NumberFormat(copy.locale).format(status.count)}), ...(status.action ? {action:replayActionCopy(valuePreference,status.action).text} : {})}
  return {...copy,text:copy.text.replace(/\{([a-zA-Z]+)\}/g,(placeholder,name)=>values[name] ?? placeholder)}
}

export function memoryMediaCopy(preference: LocalePreference, id: UraiMessageId) {
  switch(id) {
    case 'memoryMedia.attaching': return localizedMessage(preference,'memoryMedia.attaching')
    case 'memoryMedia.attached': return localizedMessage(preference,'memoryMedia.attached')
    case 'memoryMedia.reauthenticate': return localizedMessage(preference,'memoryMedia.reauthenticate')
    case 'memoryMedia.offline': return localizedMessage(preference,'memoryMedia.offline')
    case 'memoryMedia.unsupported': return localizedMessage(preference,'memoryMedia.unsupported')
    case 'memoryMedia.unconfirmed': return localizedMessage(preference,'memoryMedia.unconfirmed')
    case 'memoryMedia.summary': return localizedMessage(preference,'memoryMedia.summary')
    case 'memoryMedia.instructions': return localizedMessage(preference,'memoryMedia.instructions')
    case 'memoryMedia.fileLabel': return localizedMessage(preference,'memoryMedia.fileLabel')
    case 'memoryMedia.pending': return localizedMessage(preference,'memoryMedia.pending')
    case 'memoryMedia.attach': return localizedMessage(preference,'memoryMedia.attach')
    default: throw new Error('UNREGISTERED_MEMORY_MEDIA_STATUS')
  }
}

export function copyProps(copy: ReturnType<typeof localizedMessage>) {
  return {lang:copy.locale,dir:copy.direction,'data-urai-translation-preview':String(copy.preview)}
}
