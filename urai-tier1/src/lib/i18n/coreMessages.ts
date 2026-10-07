// Working general-interface translations. These rows do not grant native-language
// acceptance or translate private memory content, legal terms, or consent policy.
export const URAI_CORE_MESSAGES = {
  'settings.language': {id:'settings.language', source:'Language', sensitivity:'general', description:'Device language preference label'},
  'locale.preview': {id:'locale.preview', source:'Translation preview', sensitivity:'general', description:'Explicit working-translation preview toggle'},
  'common.close': {id:'common.close', source:'Close', sensitivity:'general', description:'Close a navigation panel'},
  'common.search': {id:'common.search', source:'Search', sensitivity:'general', description:'Memory navigation search label'},
  'common.all': {id:'common.all', source:'All', sensitivity:'general', description:'Unfiltered navigation selection'},
  'common.overview': {id:'common.overview', source:'Overview', sensitivity:'general', description:'Return to the Life Map overview'},
  'common.results': {id:'common.results', source:'Results: {count}', sensitivity:'general', description:'Filtered result count formatted for the selected locale'},
  'common.history': {id:'common.history', source:'History', sensitivity:'general', description:'Replay operation history heading'},
  'focus.enterReplay': {id:'focus.enterReplay', source:'Enter Replay', sensitivity:'general', description:'Enter the selected memory replay'},
  'focus.recenter': {id:'focus.recenter', source:'Recenter', sensitivity:'general', description:'Restore the arrival camera'},
  'focus.explore': {id:'focus.explore', source:'Explore', sensitivity:'general', description:'Open exploration instructions'},
  'replay.returnFocus': {id:'replay.returnFocus', source:'Return to Focus', sensitivity:'general', description:'Return from Replay to Focus'},
  'home.lifeMapAction': {id:'home.lifeMapAction', source:'Open Life Map directly', sensitivity:'general', description:'Accessible Home Life Map destination'},
} as const

const ids = Object.keys(URAI_CORE_MESSAGES) as Array<keyof typeof URAI_CORE_MESSAGES>
const rows: Record<string, readonly string[]> = {
  en: ids.map(id => URAI_CORE_MESSAGES[id].source),
  'zh-Hans': ['语言','翻译预览','关闭','搜索','全部','概览','结果：{count}','历史记录','进入回放','重新居中','探索','返回聚焦','直接打开生命地图'],
  hi: ['भाषा','अनुवाद पूर्वावलोकन','बंद करें','खोजें','सभी','अवलोकन','परिणाम: {count}','इतिहास','रीप्ले में जाएँ','फिर से केंद्रित करें','अन्वेषण करें','फोकस पर लौटें','जीवन मानचित्र सीधे खोलें'],
  es: ['Idioma','Vista previa de traducción','Cerrar','Buscar','Todos','Vista general','Resultados: {count}','Historial','Entrar en la repetición','Centrar de nuevo','Explorar','Volver al enfoque','Abrir el mapa de vida directamente'],
  fr: ['Langue','Aperçu de traduction','Fermer','Rechercher','Tous','Vue d’ensemble','Résultats : {count}','Historique','Entrer dans la relecture','Recentrer','Explorer','Revenir à la concentration','Ouvrir directement la carte de vie'],
  ar: ['اللغة','معاينة الترجمة','إغلاق','بحث','الكل','نظرة عامة','النتائج: {count}','السجل','الدخول إلى إعادة التشغيل','إعادة التوسيط','استكشاف','العودة إلى التركيز','فتح خريطة الحياة مباشرة'],
  bn: ['ভাষা','অনুবাদের পূর্বরূপ','বন্ধ করুন','খুঁজুন','সব','সারসংক্ষেপ','ফলাফল: {count}','ইতিহাস','রিপ্লেতে প্রবেশ করুন','আবার কেন্দ্রে আনুন','অন্বেষণ করুন','ফোকাসে ফিরুন','জীবন মানচিত্র সরাসরি খুলুন'],
  'pt-BR': ['Idioma','Prévia da tradução','Fechar','Buscar','Todos','Visão geral','Resultados: {count}','Histórico','Entrar na reprodução','Centralizar novamente','Explorar','Voltar ao foco','Abrir o mapa da vida diretamente'],
  ru: ['Язык','Предпросмотр перевода','Закрыть','Поиск','Все','Обзор','Результаты: {count}','История','Перейти к повтору','Вернуть в центр','Исследовать','Вернуться к фокусу','Открыть карту жизни напрямую'],
  ur: ['زبان','ترجمے کا پیش منظر','بند کریں','تلاش کریں','سب','جائزہ','نتائج: {count}','تاریخ','ری پلے میں داخل ہوں','دوبارہ مرکز میں لائیں','دریافت کریں','فوکس پر واپس جائیں','زندگی کا نقشہ براہ راست کھولیں'],
  id: ['Bahasa','Pratinjau terjemahan','Tutup','Cari','Semua','Ikhtisar','Hasil: {count}','Riwayat','Masuk ke putar ulang','Pusatkan kembali','Jelajahi','Kembali ke fokus','Buka peta kehidupan langsung'],
  de: ['Sprache','Übersetzungsvorschau','Schließen','Suchen','Alle','Übersicht','Ergebnisse: {count}','Verlauf','Wiedergabe öffnen','Neu zentrieren','Erkunden','Zurück zum Fokus','Lebenskarte direkt öffnen'],
  ja: ['言語','翻訳プレビュー','閉じる','検索','すべて','概要','結果：{count}','履歴','リプレイに入る','中央に戻す','探索','フォーカスに戻る','ライフマップを直接開く'],
  sw: ['Lugha','Hakiki ya tafsiri','Funga','Tafuta','Zote','Muhtasari','Matokeo: {count}','Historia','Fungua uchezaji tena','Rudisha katikati','Chunguza','Rudi kwenye umakini','Fungua ramani ya maisha moja kwa moja'],
  tr: ['Dil','Çeviri önizlemesi','Kapat','Ara','Tümü','Genel bakış','Sonuçlar: {count}','Geçmiş','Tekrar oynatmaya gir','Yeniden ortala','Keşfet','Odağa dön','Yaşam haritasını doğrudan aç'],
  vi: ['Ngôn ngữ','Xem trước bản dịch','Đóng','Tìm kiếm','Tất cả','Tổng quan','Kết quả: {count}','Lịch sử','Vào phát lại','Đưa về trung tâm','Khám phá','Quay lại tập trung','Mở bản đồ cuộc sống trực tiếp'],
  fil: ['Wika','Preview ng pagsasalin','Isara','Maghanap','Lahat','Pangkalahatang tanaw','Mga resulta: {count}','Kasaysayan','Buksan ang replay','Igitna muli','Tuklasin','Bumalik sa pokus','Direktang buksan ang mapa ng buhay'],
  ko: ['언어','번역 미리보기','닫기','검색','전체','개요','결과: {count}','기록','다시 재생으로 이동','중앙으로 복귀','탐색','포커스로 돌아가기','라이프 맵 바로 열기'],
  it: ['Lingua','Anteprima della traduzione','Chiudi','Cerca','Tutti','Panoramica','Risultati: {count}','Cronologia','Entra nella riproduzione','Ricentra','Esplora','Torna al focus','Apri direttamente la mappa della vita'],
  fa: ['زبان','پیش‌نمایش ترجمه','بستن','جستجو','همه','نمای کلی','نتایج: {count}','تاریخچه','ورود به بازپخش','بازگرداندن به مرکز','کاوش','بازگشت به تمرکز','باز کردن مستقیم نقشه زندگی'],
}

export const URAI_CORE_CATALOGS = Object.fromEntries(Object.entries(rows).map(([locale, row]) => {
  if (row.length !== ids.length) throw new Error(`CORE_CATALOG_LENGTH:${locale}`)
  return [locale, Object.fromEntries(ids.map((id, index) => [id, row[index]]))]
})) as Record<string, Record<keyof typeof URAI_CORE_MESSAGES, string>>
