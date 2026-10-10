import type { UraiCatalog, UraiLaunchLocale, UraiMessageDefinition } from './locales'

// These catalogs prepare review material. Sensitive unavailable-memory copy
// remains in the admitted runtime language; preparation admits no language.
export const URAI_FOCUS_COMPATIBILITY_MESSAGES = {
  'focus.compatibility.unavailableTitle': { id:'focus.compatibility.unavailableTitle', source:'Selected memory unavailable', sensitivity:'privacy', description:'Unavailable selected-memory heading on the compatibility Focus session route' },
  'focus.compatibility.unavailableDescription': { id:'focus.compatibility.unavailableDescription', source:'This memory cannot be opened in Focus because it is unavailable, private, locked, deleted, or not part of the launch-safe demo set.', sensitivity:'privacy', description:'Fail-closed explanation without revealing any private selected-memory identity' },
  'focus.compatibility.returnLifeMap': { id:'focus.compatibility.returnLifeMap', source:'Return to Life Map', sensitivity:'general', description:'Safe return navigation from an unavailable compatibility Focus session' },
} as const satisfies Record<string, UraiMessageDefinition>

const prepared: Record<UraiLaunchLocale, readonly [string, string, string]> = {
  en: ['Selected memory unavailable', 'This memory cannot be opened in Focus because it is unavailable, private, locked, deleted, or not part of the launch-safe demo set.', 'Return to Life Map'],
  'zh-Hans': ['所选记忆不可用', '此记忆无法在聚焦中打开，因为它不可用、属于私人内容、已锁定、已删除，或不属于可安全发布的演示集合。', '返回生命地图'],
  hi: ['चुनी गई स्मृति उपलब्ध नहीं है', 'यह स्मृति फोकस में नहीं खोली जा सकती क्योंकि यह उपलब्ध नहीं है, निजी है, लॉक की गई है, हटाई गई है, या लॉन्च के लिए सुरक्षित डेमो संग्रह का हिस्सा नहीं है।', 'जीवन मानचित्र पर लौटें'],
  es: ['Recuerdo seleccionado no disponible', 'Este recuerdo no se puede abrir en Enfoque porque no está disponible, es privado, está bloqueado, se ha eliminado o no forma parte del conjunto de demostración seguro para el lanzamiento.', 'Volver al Mapa de vida'],
  fr: ['Souvenir sélectionné indisponible', 'Ce souvenir ne peut pas être ouvert dans Concentration, car il est indisponible, privé, verrouillé, supprimé ou ne fait pas partie des démonstrations sûres pour le lancement.', 'Revenir à la Carte de vie'],
  ar: ['الذكرى المحددة غير متاحة', 'لا يمكن فتح هذه الذكرى في التركيز لأنها غير متاحة أو خاصة أو مقفلة أو محذوفة أو ليست ضمن مجموعة العرض التوضيحي الآمنة للإطلاق.', 'العودة إلى خريطة الحياة'],
  bn: ['নির্বাচিত স্মৃতি উপলব্ধ নেই', 'এই স্মৃতিটি ফোকাসে খোলা যাবে না, কারণ এটি উপলব্ধ নেই, ব্যক্তিগত, লক করা, মুছে ফেলা হয়েছে, অথবা লঞ্চের জন্য নিরাপদ ডেমো সংগ্রহের অংশ নয়।', 'জীবন মানচিত্রে ফিরে যান'],
  'pt-BR': ['Memória selecionada indisponível', 'Esta memória não pode ser aberta no Foco porque está indisponível, é privada, está bloqueada, foi excluída ou não faz parte do conjunto de demonstração seguro para o lançamento.', 'Voltar ao Mapa da vida'],
  ru: ['Выбранное воспоминание недоступно', 'Это воспоминание нельзя открыть в Фокусе, потому что оно недоступно, является личным, заблокировано, удалено или не входит в безопасный для запуска демонстрационный набор.', 'Вернуться к Карте жизни'],
  ur: ['منتخب یاد دستیاب نہیں ہے', 'یہ یاد فوکس میں نہیں کھولی جا سکتی کیونکہ یہ دستیاب نہیں، نجی ہے، مقفل ہے، حذف ہو چکی ہے، یا لانچ کے لیے محفوظ ڈیمو مجموعے کا حصہ نہیں ہے۔', 'زندگی کے نقشے پر واپس جائیں'],
  id: ['Memori yang dipilih tidak tersedia', 'Memori ini tidak dapat dibuka di Fokus karena tidak tersedia, bersifat pribadi, terkunci, dihapus, atau bukan bagian dari kumpulan demo yang aman untuk peluncuran.', 'Kembali ke Peta Kehidupan'],
  de: ['Ausgewählte Erinnerung nicht verfügbar', 'Diese Erinnerung kann nicht in Fokus geöffnet werden, weil sie nicht verfügbar, privat, gesperrt, gelöscht oder nicht Teil des für den Start sicheren Demo-Satzes ist.', 'Zur Lebenskarte zurückkehren'],
  ja: ['選択した記憶は利用できません', 'この記憶は、利用不可、非公開、ロック済み、削除済み、または公開時に安全に利用できるデモセットに含まれていないため、フォーカスで開けません。', 'ライフマップに戻る'],
  sw: ['Kumbukumbu iliyochaguliwa haipatikani', 'Kumbukumbu hii haiwezi kufunguliwa katika Lenga kwa sababu haipatikani, ni ya faragha, imefungwa, imefutwa, au si sehemu ya seti ya maonyesho iliyo salama kwa uzinduzi.', 'Rudi kwenye Ramani ya Maisha'],
  tr: ['Seçilen anı kullanılamıyor', 'Bu anı; kullanılamadığı, özel olduğu, kilitli olduğu, silindiği veya lansman için güvenli demo kümesinin parçası olmadığı için Odak içinde açılamaz.', 'Yaşam Haritasına dön'],
  vi: ['Ký ức đã chọn không khả dụng', 'Không thể mở ký ức này trong Tập trung vì ký ức không khả dụng, ở chế độ riêng tư, bị khóa, đã bị xóa hoặc không thuộc bộ bản demo an toàn cho việc ra mắt.', 'Quay lại Bản đồ Cuộc sống'],
  fil: ['Hindi available ang napiling alaala', 'Hindi mabubuksan ang alaalang ito sa Pokus dahil hindi ito available, pribado, naka-lock, nabura, o hindi bahagi ng demo set na ligtas para sa paglulunsad.', 'Bumalik sa Mapa ng Buhay'],
  ko: ['선택한 기억을 사용할 수 없습니다', '이 기억은 사용할 수 없거나 비공개, 잠김, 삭제 상태이거나 출시 시 안전하게 사용할 수 있는 데모 모음에 포함되지 않아 포커스에서 열 수 없습니다.', '라이프 맵으로 돌아가기'],
  it: ['Ricordo selezionato non disponibile', 'Questo ricordo non può essere aperto in Focus perché non è disponibile, è privato, bloccato, eliminato o non fa parte del gruppo di dimostrazioni sicure per il lancio.', 'Torna alla Mappa della vita'],
  fa: ['خاطرهٔ انتخاب‌شده در دسترس نیست', 'این خاطره را نمی‌توان در تمرکز باز کرد، زیرا در دسترس نیست، خصوصی است، قفل شده، حذف شده، یا بخشی از مجموعهٔ نمایشی ایمن برای عرضه نیست.', 'بازگشت به نقشهٔ زندگی'],
}

export const URAI_FOCUS_COMPATIBILITY_CATALOGS = Object.fromEntries(
  Object.entries(prepared).map(([locale, values]) => [locale, {
    'focus.compatibility.unavailableTitle': values[0],
    'focus.compatibility.unavailableDescription': values[1],
    'focus.compatibility.returnLifeMap': values[2],
  }]),
) as Record<UraiLaunchLocale, UraiCatalog>
