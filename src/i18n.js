const T = {
  all: ['Բոլորը', 'Все', 'All'],
  rent: ['Վարձակալություն', 'Аренда', 'Rent'],
  daily: ['Օրավարձով', 'Посуточно', 'Daily'],
  sale: ['Վաճառք', 'Продажа', 'Sale'],
  newb: ['Նորակառույցներ', 'Новостройки', 'New builds'],
  comm: ['Առևտրային', 'Коммерческая', 'Commercial'],
  post: ['Տեղադրել', 'Разместить', 'Post a listing'],
  cabinet: ['Աշխատասեղան', 'Кабинет', 'Dashboard'],
  favs: ['Ընտրանի', 'Избранное', 'Saved'],
  messages: ['Հաղորդագրություններ', 'Сообщения', 'Messages'],
  signin: ['Մուտք', 'Войти', 'Sign in'],
  searchW: ['Որոնում', 'Поиск', 'Search'],
  mainNav: ['Հիմնական նավարկություն', 'Основная навигация', 'Main navigation'],
  clearSearch: ['Մաքրել որոնումը', 'Очистить поиск', 'Clear search'],
  openGallery: ['Բացել լուսանկարների պատկերասրահը', 'Открыть галерею фото', 'Open photo gallery'],
  closeW: ['Փակել', 'Закрыть', 'Close'],
  galleryPrev: ['Նախորդ լուսանկարը', 'Предыдущее фото', 'Previous photo'],
  galleryNext: ['Հաջորդ լուսանկարը', 'Следующее фото', 'Next photo'],
  galleryPhoto: ['Լուսանկար', 'Фото', 'Photo'],
  homeLink: ['HayHome, գլխավոր էջ', 'HayHome, на главную', 'HayHome, go to homepage'],
  langLbl: ['Լեզու', 'Язык', 'Language'],
  selectCountry: ['Ընտրել երկիրը', 'Выбрать страну', 'Select country'],
  mapW: ['Քարտեզ', 'Карта', 'Map'],
  listW: ['Ցուցակ', 'Список', 'List'],
  searchPh: ['Քաղաք, թաղամաս, փողոց…', 'Город, район, улица…', 'City, district, street…'],
  find: ['Գտնել', 'Найти', 'Show'],
  onlyVerified: ['Միայն հաստատվածները', 'Только подтверждённые', 'Verified only'],
  noAgency: ['Առանց գործակալությունների', 'Без агентств', 'No agencies'],
  roomsW: ['Սենյակներ', 'Комнаты', 'Rooms'],
  allFilters: ['Բոլոր զտիչները', 'Все фильтры', 'All filters'],
  sort: ['Դասավորել', 'Сортировка', 'Sort'],
  sortFresh: ['սկզբում թարմերը', 'сначала свежие', 'freshest'],
  sortCheap: ['սկզբում էժանները', 'сначала дешёвые', 'cheapest'],
  sortExp: ['սկզբում թանկերը', 'сначала дорогие', 'priciest'],
  sortScore: ['ըստ ազնվության', 'по честности', 'by honesty'],
  sortArea: ['ըստ մակերեսի', 'по площади', 'by area'],
  resSub: ['Հաստատված են վերջին 72 ժամում', 'Подтверждены владельцем за 72 часа', 'Confirmed by the owner within 72h'],
  resSubLoose: [
    'Ներառյալ ժամկետանցները — զանգը կարող է ապարդյուն լինել',
    'Включая просроченные — звонок может быть впустую',
    'Including expired ones — the call may be wasted'
  ],
  titleRent: ['Բնակարանների վարձակալություն', 'Аренда квартир', 'Apartments for rent'],
  titleDaily: ['Օրավարձով բնակարաններ', 'Посуточная аренда', 'Daily rentals'],
  titleSale: ['Բնակարանների վաճառք', 'Продажа квартир', 'Apartments for sale'],
  titleNew: ['Նորակառույցներ', 'Новостройки', 'New developments'],
  titleComm: ['Առևտրային անշարժ գույք', 'Коммерческая недвижимость', 'Commercial property'],
  photosN: ['{n} լուսանկար', '{n} фото', '{n} photos'],
  viewBtn: ['Դիտել', 'Смотреть', 'View'],
  alreadyTaken: ['Արդեն վարձակալվա՞ծ է', 'Уже сдана?', 'Already taken?'],
  honesty: ['Ազնվություն', 'Честность', 'Honesty'],
  complaintsW: ['բողոք «արդեն զբաղված է»', 'жалоб «уже сдана»', '"already taken" reports'],
  emptyTitle: ['Ոչինչ չի գտնվել', 'Ничего не найдено', 'Nothing found'],
  emptyText: [
    'Փորձեք մեղմել զտիչները — ցուցակում միայն հաստատված հայտարարություններն են',
    'Попробуйте смягчить фильтры — в выдаче только подтверждённые объявления',
    'Try relaxing the filters — the feed only holds confirmed listings'
  ],
  resetFilters: ['Զրոյացնել զտիչները', 'Сбросить фильтры', 'Reset filters'],
  showMore: ['Ցույց տալ ևս {n}', 'Показать ещё {n}', 'Show {n} more'],
  studio: ['Ստուդիա', 'Студия', 'Studio'],
  roomsN: ['{n} սեն.', '{n} комн.', '{n} rooms'],
  floorN: ['{a}/{b} հարկ', '{a}/{b} эт.', 'floor {a}/{b}'],
  distFromCenter: ['{x} կենտրոնից', '{x} от центра', '{x} from center'],
  voicePlayBlocked: [
    'Բրաուզերը արգելափակեց ձայնագրության նվագարկումը',
    'Браузер заблокировал воспроизведение — нажмите ещё раз',
    'Browser blocked playback — tap again'
  ],
  voicePlayUnsupported: [
    'Ձայնագրության ձևաչափը չի աջակցվում այս սարքում',
    'Формат записи не поддерживается на этом устройстве',
    'This device can’t play this recording format'
  ],
  voicePlayFailed: [
    'Չհաջողվեց նվագարկել ձայնագրությունը',
    'Не удалось воспроизвести голосовое сообщение',
    'Couldn’t play the voice message'
  ],
  secondsN: ['{n} վայրկյան', '{n} секунда|{n} секунды|{n} секунд', '{n} second|{n} seconds'],
  voicePlayA11y: [
    'Նվագարկել ձայնային հաղորդագրությունը, {dur}{when}',
    'Воспроизвести голосовое сообщение, {dur}{when}',
    'Play voice message, {dur}{when}'
  ],
  voicePauseA11y: [
    'Դադարեցնել ձայնային հաղորդագրությունը, {dur}',
    'Приостановить голосовое сообщение, {dur}',
    'Pause voice message, {dur}'
  ],
  voiceWhenA11y: [', {date}, {time}', ', {date} в {time}', ', {date} at {time}'],
  showTranscript: ['Ցույց տալ տեքստը', 'Показать текст', 'Show text'],
  hideTranscript: ['Թաքցնել տեքստը', 'Скрыть текст', 'Hide text'],
  transcribing: ['Ճանաչում…', 'Распознаём…', 'Transcribing…'],
  errNotVoiceMessage: ['Սա ձայնագրություն չէ', 'Это не голосовое сообщение', 'This isn’t a voice message'],
  errTranscribeFailed: [
    'Չհաջողվեց ճանաչել ձայնագրությունը',
    'Не удалось распознать голосовое сообщение',
    'Couldn’t transcribe the voice message'
  ],
  mUnit: ['մ', 'м', 'm'],
  kmUnit: ['կմ', 'км', 'km'],
  perMonth: ['/ ամիս', '/ мес', '/ mo'],
  perDay: ['/ օր', '/ сутки', '/ night'],
  perObject: ['', '', ''],
  stToday: ['Հաստատված {x}', 'Подтверждено {x}', 'Confirmed {x}'],
  stAging: ['Հաստատված {x}', 'Подтверждено {x}', 'Confirmed {x}'],
  stDue: ['Ժամկետը լրանում է', 'Срок истекает', 'Expiring now'],
  stFlag: ['Բողոքները ստուգվում են', 'Жалобы на проверке', 'Reports under review'],
  stArch: ['Արխիվ', 'Архив', 'Archived'],
  shFresh: ['Այսօր', 'Сегодня', 'Today'],
  shAging: ['2 օր', '2 дня', '2 days'],
  shDue: ['Լրանում է', 'Истекает', 'Expiring'],
  shFlag: ['Բողոք', 'Жалобы', 'Reports'],
  shArch: ['Արխիվ', 'Архив', 'Archived'],
  hAgo: ['{n} ժ առաջ', '{n} ч назад', '{n}h ago'],
  dAgo: ['{n} օր առաջ', '{n} дн. назад', '{n}d ago'],
  ownerW: ['Սեփականատեր', 'Собственник', 'Owner'],
  agencyW: ['Գործակալություն', 'Агентство', 'Agency'],
  warnFlag: [
    '{n} բողոք «արդեն զբաղված է» — հայտարարությունը ստուգվում է',
    '{n} жалоб «уже сдана» — объявление проверяется, звонок может быть впустую',
    '{n} "already taken" reports — under review, the call may be wasted'
  ],
  warnScore: [
    'Գործակալությունը {n}% դեպքում չի հանում զբաղված հայտարարությունները',
    'Агентство {n}% раз не снимало объявления после сдачи',
    'This agency failed to remove taken listings {n}% of the time'
  ],
  show: ['Ցույց տալ', 'Показать', 'Show'],
  hide: ['Թաքցնել', 'Скрыть', 'Hide'],
  footNote: [
    'Վարձակալություն և վաճառք ամբողջ Հայաստանում. հայտարարությունն ապրում է, քանի դեռ սեփականատերը հաստատում է, որ բնակարանն ազատ է։',
    'Аренда и продажа жилья по всей Армении. Объявление живёт, пока владелец подтверждает, что квартира свободна.',
    'Rentals and sales across Armenia. A listing stays alive only while its owner confirms the home is free.'
  ],
  forOwners: ['Սեփականատերերին', 'Владельцам', 'For owners'],
  rules: ['Կանոններ', 'Правила', 'Rules'],
  howWorks: ['Ինչպես է աշխատում ստուգումը', 'Как работает проверка', 'How verification works'],
  moderation: ['Բողոքներ և մոդերացիա', 'Жалобы и модерация', 'Reports and moderation'],
  guest: ['Հյուր', 'Гость', 'Guest'],
  favAdded: [
    'Ընտրանիում է. կզգուշացնենք, եթե հայտարարությունը դուրս գա ցուցակից',
    'В избранном. Предупредим, если объявление уйдёт из выдачи',
    'Saved. We will warn you if it leaves the feed'
  ],
  favRemoved: ['Հեռացվեց ընտրանուց', 'Убрано из избранного', 'Removed from saved'],
  langToast: ['Ինտերֆեյսի լեզուն՝ {x}', 'Язык интерфейса: {x}', 'Interface language: {x}'],
  strictOn: [
    'Ցուցադրվում են միայն 72 ժամում հաստատվածները',
    'Показаны только объявления, подтверждённые за 72 часа',
    'Showing only listings confirmed within 72 hours'
  ],
  strictOff: [
    'Ուշադրություն՝ միացված են ժամկետանց և բողոքարկված հայտարարությունները',
    'Внимание: включены просроченные объявления и объявления с жалобами',
    'Heads up: expired and reported listings are now included'
  ],
  filtersReset: ['Զտիչները զրոյացված են', 'Фильтры сброшены', 'Filters reset'],
  vipTitle: ['VIP հայտարարություններ', 'VIP-объявления', 'VIP listings'],
  vipSub: [
    'Ընտրված առաջարկներ, որոնք սեփականատերերն առանձնացրել են',
    'Отдельные предложения, выделенные их владельцами',
    'Standout listings their owners chose to highlight'
  ],
  vipAll: ['Բոլորը', 'Все', 'All'],
  vipBack: ['Ամբողջ ցուցակին', 'Ко всей выдаче', 'Back to the full feed'],
  vipPrev: ['Նախորդը', 'Назад', 'Previous'],
  vipNext: ['Հաջորդը', 'Далее', 'Next'],
  vipEmptyTitle: ['VIP հայտարարություններ չկան', 'VIP-объявлений не найдено', 'No VIP listings found'],
  vipEmptyText: [
    'Ընթացիկ զտիչներով VIP տարբերակներ չկան։ Փորձեք վերադառնալ ամբողջ ցուցակին',
    'По текущим фильтрам VIP-вариантов нет. Вернитесь к полной выдаче',
    'No VIP homes match the current filters — go back to the full feed'
  ]
};

Object.assign(T, {
  mapLive: ['{n} ազատ քարտեզի վրա', '{n} объявление на карте|{n} объявления на карте|{n} объявлений на карте', '{n} live on the map'],
  mapSub: ['հաստատված է 72 ժամում', 'подтверждено за 72 часа', 'confirmed within 72 hours'],
  mapViewSwitchLbl: ['Ցուցադրման ռեժիմ', 'Режим отображения', 'Display mode'],
  mapPageTitle: ['Հայտարարությունների քարտեզ', 'Карта объявлений', 'Listings map'],
  notFoundTitle: ['Էջը չի գտնվել', 'Страница не найдена', 'Page not found'],
  notFoundText: [
    'Այս հասցեն գոյություն չունի կամ տեղափոխվել է։ Ստուգեք հղումը կամ վերադարձեք որոնմանը։',
    'Такого адреса не существует или он был перемещён. Проверьте ссылку или вернитесь к поиску.',
    'This address doesn’t exist or has moved. Check the link or go back to search.'
  ],
  notFoundToSearch: ['Անցնել որոնմանը', 'К поиску', 'Go to search'],
  notFoundToHome: ['Գլխավոր էջ', 'На главную', 'Go to homepage'],
  mapHint: ['Ժամկետանցներն ավտոմատ թաքցված են', 'Просроченные скрыты автоматически', 'Expired listings are hidden automatically'],
  searchArea: ['Փնտրել այս տարածքում', 'Искать в этой области', 'Search this area'],
  clearArea: ['Հանել տարածքի սահմանափակումը', 'Сбросить область', 'Clear area'],
  areaOn: [
    'Ցուցադրվում են միայն քարտեզի տեսանելի հատվածի հայտարարությունները',
    'Показаны объявления только из видимой части карты',
    'Showing listings inside the visible map area only'
  ],
  areaOff: ['Տարածքի սահմանափակումը հանված է', 'Ограничение области снято', 'Area filter cleared'],
  asList: ['Ցուցակով', 'Списком', 'As list'],
  legFresh: ['Հաստատված այսօր', 'Подтверждено сегодня', 'Confirmed today'],
  legAging: ['1–3 օր', '1–3 дня', '1–3 days'],
  legSelected: ['Ընտրված', 'Выбрано', 'Selected'],
  legVip: ['VIP', 'VIP', 'VIP'],
  areaUnavailable: ['Այս քարտեզի համար հասանելի չէ', 'Недоступно для этой карты', 'Not available for this map'],
  q1: ['Բարև ձեզ։ Բնակարանը դեռ ազա՞տ է։', 'Здравствуйте! Квартира ещё свободна?', 'Hello! Is the home still available?'],
  q2: ['Կարելի՞ է այսօր տեսնել։', 'Можно посмотреть сегодня?', 'Can I see it today?'],
  q3: ['Ի՞նչ կանխավճար և կոմունալ վճարներ են։', 'Депозит и коммунальные?', 'What about deposit and utilities?'],
  typeSomething: ['Մուտքագրեք հաղորդագրություն', 'Введите сообщение', 'Type a message first'],
  msgPh: ['Գրել հաղորդագրություն…', 'Написать сообщение…', 'Write a message…'],
  sendW: ['Ուղարկել', 'Отправить', 'Send'],
  listingW: ['Հայտարարություն', 'Объявление', 'Listing'],
  chatEmptyT: ['Դեռ նամակագրություն չկա', 'Переписок пока нет', 'No conversations yet'],
  chatEmptyS: [
    'Բացեք ցանկացած հայտարարություն և սեղմեք «Գրել չաթում»։',
    'Откройте любое объявление и нажмите «Написать в чат».',
    'Open any listing and hit "Message the owner".'
  ]
});

Object.assign(T, {
  authHero: [
    'Հայտարարությունն ապրում է, քանի դեռ բնակարանն ազատ է',
    'Объявление живёт, пока квартира свободна',
    'A listing lives only while the home is free'
  ],
  authHeroSub: [
    'Մուտք գործեք հեռախոսահամարով։ Կոդը գալիս է նույն համարին, որով հետո հաստատվում է հայտարարությունների արդիականությունը։',
    'Войдите по номеру телефона. Код приходит на тот же номер, которым потом подтверждается актуальность объявлений.',
    'Sign in with your phone. The same number later confirms your listings are still available.'
  ],
  authFact1: [
    'Ցուցակում միայն 72 ժամում հաստատված հայտարարություններ',
    'В выдаче только объявления, подтверждённые за 72 часа',
    'The feed only holds listings confirmed within 72 hours'
  ],
  authFact2: [
    'Բողոքն անմիջապես թաքցնում է հայտարարությունը',
    'Жалоба сразу скрывает объявление из выдачи',
    'A report hides the listing immediately'
  ],
  authFact3: [
    'VIP-առաջխաղացումը ձեռք է բերվում վաստակած տոկեններով',
    'VIP-продвижение — на заработанные токены',
    'VIP boost is earned with tokens'
  ],
  authFoot: ['HayHome · Հայաստան', 'HayHome · Армения', 'HayHome · Armenia'],
  entryTitle: ['Մուտք', 'Вход', 'Sign in'],
  noAccountQ: ['Դեռ չունե՞ք հաշիվ', 'Ещё нет аккаунта?', 'Don’t have an account yet?'],
  registerLink: ['Գրանցվել', 'Зарегистрироваться', 'Sign up'],
  haveAccountQ: ['Արդեն ունե՞ք հաշիվ', 'Уже есть аккаунт?', 'Already have an account?'],
  phoneTitle: ['Գրանցում', 'Регистрация', 'Sign up'],
  phoneSub: [
    'Ուղարկելու ենք SMS-կոդ՝ համարը հաստատելու և գաղտնաբառ ստեղծելու համար։',
    'Пришлём код по SMS, чтобы подтвердить номер и придумать пароль.',
    'We’ll text you a code to confirm the number and set a password.'
  ],
  phoneLbl: ['Հեռախոսահամար', 'Номер телефона', 'Phone number'],
  getCode: ['Շարունակել', 'Продолжить', 'Continue'],
  phoneErr: ['Մուտքագրեք {n} նիշ', 'Введите {n} цифр номера', 'Enter {n} digits'],
  codeTitle: ['Կոդը ուղարկված է', 'Код отправлен', 'Code sent'],
  codeSub: ['Մուտքագրեք {p} համարին ուղարկված կոդը', 'Введите код, отправленный на {p}', 'Enter the code we sent to {p}'],
  codeLbl: ['Կոդ SMS-ից', 'Код из SMS', 'SMS code'],
  codeErr: ['4 նիշ', '4 цифры', '4 digits'],
  confirmW: ['Հաստատել', 'Подтвердить', 'Confirm'],
  resend: ['Ուղարկել կրկին', 'Отправить снова', 'Resend'],
  resendIn: ['Կրկին {n} վրկ հետո', 'Повторно через {n} сек.', 'Resend in {n}s'],
  changeNum: ['Փոխել համարը', 'Изменить номер', 'Change number'],
  roleTitle: ['Ինչպե՞ս եք օգտվելու HayHome-ից', 'Как вы будете пользоваться HayHome', 'How will you use HayHome'],
  roleSub: [
    'Դրանից կախված է անձնական էջի տեսքը։ Հետո կարելի է փոխել։',
    'От этого зависит кабинет. Позже можно изменить.',
    'This shapes your dashboard. You can change it later.'
  ],
  roleTenant: ['Փնտրում եմ բնակարան', 'Ищу жильё', 'Looking for a home'],
  roleTenantN: ['Ընտրանի, չաթեր, բողոքների կարգավիճակ', 'Избранное, чаты, статус жалоб', 'Saved homes, chats, report status'],
  roleOwner: ['Հանձնում եմ իմ բնակարանը', 'Сдаю своё жильё', 'Renting out my own home'],
  roleOwnerN: ['1–3 օբյեկտ, պարզ հաստատում SMS-ով', '1–3 объекта, простое подтверждение по SMS', '1–3 places, one-tap SMS confirmation'],
  roleAgency: ['Գործակալություն', 'Агентство', 'Agency'],
  roleAgencyN: [
    'Աղյուսակ, զանգվածային հաստատում, թիմ, վարկանիշ',
    'Таблица, массовое подтверждение, команда, рейтинг',
    'Table view, bulk confirm, team, rating'
  ],
  nameLbl: ['Ինչպե՞ս դիմել ձեզ', 'Как к вам обращаться', 'Your name'],
  namePh: ['Անի Հակոբյան', 'Ани Акопян', 'Ani Hakobyan'],
  agencyLbl: ['Գործակալության անվանում', 'Название агентства', 'Agency name'],
  agencyPh: ['Yerevan Home', 'Yerevan Home', 'Yerevan Home'],
  finishW: ['Ավարտել', 'Завершить', 'Finish'],
  welcomeToast: ['Բարի գալուստ, {n}։', 'Добро пожаловать, {n}!', 'Welcome, {n}!'],
  signOutToast: ['Դուք դուրս եք եկել', 'Вы вышли из аккаунта', 'You are signed out'],
  filtersTitle: ['Բոլոր զտիչները', 'Все фильтры', 'All filters'],
  freshTitle: ['Հաստատման թարմություն', 'Свежесть подтверждения', 'Confirmation freshness'],
  fresh24: ['Հաստատված այսօր', 'Подтверждено сегодня', 'Confirmed today'],
  fresh48: ['48 ժամում', 'За 48 часов', 'Within 48 hours'],
  fresh72: ['72 ժամում (առավելագույն)', 'За 72 часа (максимум)', 'Within 72 hours (max)'],
  freshAll: ['Ցույց տալ նաև ժամկետանցները', 'Показать и просроченные', 'Include expired ones'],
  priceTitle: ['Գին, ֏', 'Цена, ֏', 'Price, ֏'],
  areaTitle: ['Մակերես, մ²', 'Площадь, м²', 'Area, m²'],
  fromW: ['-ից', 'от', 'from'],
  toW: ['-ը', 'до', 'to'],
  roomsTitle: ['Սենյակներ', 'Комнат', 'Rooms'],
  cityTitle: ['Քաղաք', 'Город', 'City'],
  amenTitle: ['Հարմարություններ', 'Удобства', 'Amenities'],
  sellerTitle: ['Ով է հանձնում', 'Кто сдаёт', 'Listed by'],
  showNLive: ['Ցույց տալ {n} հայտարարություն', 'Показать {n} объявлений', 'Show {n} listings'],
  resetW: ['Զրոյացնել', 'Сбросить', 'Reset'],
  allW: ['Բոլորը', 'Все', 'All'],
  anyOptW: ['Ցանկացած', 'Любой', 'Any'],
  pickedNW: ['Ընտրված է {n}', 'Выбрано: {n}', '{n} selected'],
  reportKicker: ['Բողոք հայտարարության վերաբերյալ', 'Жалоба на объявление', 'Report a listing'],
  reportQ: ['Ի՞նչ տեղի ունեցավ, երբ կապ հաստատեցիք', 'Что произошло, когда вы связались?', 'What happened when you got in touch?'],
  rs1: [
    'Ասացին, որ բնակարանն արդեն զբաղված է, և առաջարկեցին ուրիշը',
    'Сказали, что квартира уже сдана, и предложили другой вариант',
    'They said it is taken and offered another place'
  ],
  rs2: ['Ավելի քան մեկ օր ոչ ոք չի պատասխանում', 'Никто не отвечает больше суток', 'Nobody has answered for over a day'],
  rs3: ['Գինը կամ պայմանները տեղում այլ էին', 'Цена или условия на месте оказались другими', 'Price or terms differed on the spot'],
  rs4: ['Լուսանկարները այս բնակարանից չեն', 'Фото не от этой квартиры', 'The photos are not of this home'],
  reportPh: [
    'Մանրամասներ՝ ինչ համարից պատասխանեցին, ինչ առաջարկեցին…',
    'Детали: номер, с которого ответили, что предложили взамен…',
    'Details: which number answered, what they offered instead…'
  ],
  sendReport: ['Ուղարկել բողոքը', 'Отправить жалобу', 'Send report'],
  cancelW: ['Չեղարկել', 'Отмена', 'Cancel'],
  reportFine2: [
    'Կուղարկենք սեփականատիրոջը հաստատման հարցում։ Մինչ պատասխանը հայտարարությունը ցուցակից դուրս է։ Երեք հաստատված բողոք հանում է հայտարարությունը։',
    'Мы отправим владельцу запрос на подтверждение. Пока он не ответит — объявление вне выдачи. Три подтверждённые жалобы снимают объявление.',
    'We ask the owner to confirm. Until they do, the listing is out of the feed. Three upheld reports remove it.'
  ],
  reportPick: ['Ընտրեք, թե ինչ տեղի ունեցավ', 'Выберите, что произошло', 'Pick what happened'],
  sentTitle: ['Հայտարարությունը դուրս եկավ ցուցակից', 'Объявление ушло из выдачи', 'The listing left the feed'],
  sentText: [
    'Սեփականատիրոջն ուղարկվել է հաստատման հարցում։ Եթե 24 ժամում չպատասխանի, հայտարարությունը կմնա թաքցված, իսկ վարկանիշը կնվազի։',
    'Владельцу отправлен запрос на подтверждение. Если он не ответит за 24 часа, объявление останется скрытым, а рейтинг снизится.',
    'We asked the owner to confirm. No answer within 24 hours keeps it hidden and lowers their rating.'
  ],
  sentNote: [
    'Այս թաղամասի նման ազատ տարբերակներն արդեն ավելացրել ենք ընտրանի։',
    'Похожие живые варианты в этом районе мы добавили в избранное.',
    'We saved similar live homes in this district for you.'
  ],
  gotIt: ['Հասկանալի է', 'Понятно', 'Got it'],
  howKicker: ['Ցուցակի կանոնները', 'Правила выдачи', 'Feed rules'],
  howTitle: ['Ինչո՞ւ այստեղ մեռած հայտարարություններ չկան', 'Почему здесь нет мёртвых объявлений', 'Why there are no dead listings here'],
  how1t: ['Հաստատում՝ 72 ժամը մեկ', 'Подтверждение раз в 72 часа', 'Confirmation every 72 hours'],
  how1x: [
    'Սեփականատերը մուտքագրում է SMS-կոդ իր համարից։ Ոչ մի ավտոերկարաձգում՝ չհաստատեց, հայտարարությունը դուրս է գալիս ցուցակից նույն ժամին։',
    'Владелец вводит SMS-код с привязанного номера. Никаких автопродлений: не подтвердил — объявление уходит из выдачи в тот же час.',
    'The owner enters an SMS code from their number. No auto-renewal: miss it and the listing drops out that hour.'
  ],
  how2t: ['Բողոքն անմիջապես թաքցնում է', 'Жалоба «уже сдана» скрывает объявление сразу', 'A report hides the listing at once'],
  how2x: [
    'Մեկ բողոք՝ հայտարարությունը ցուցակից դուրս է մինչև սեփականատիրոջ պատասխանը։ Երեք հաստատված բողոք՝ հանում և իջեցնում է վարկանիշը։',
    'Одна жалоба — объявление вне выдачи до ответа владельца. Три подтверждённые жалобы — снятие и публичное понижение рейтинга.',
    'One report pulls it from the feed until the owner answers. Three upheld reports remove it and cut the public rating.'
  ],
  how3t: ['Տոկեններ ազնիվ գործողությունների համար', 'Токены за честные действия', 'Tokens for honest actions'],
  how3x: [
    'Ժամանակին հաստատումները և բողոքների բացակայությունը տոկեններ են բերում։ 100 տոկենը տալիս է VIP 7 օրով։',
    'Подтверждения вовремя и отсутствие жалоб приносят токены. 100 токенов дают VIP на 7 дней.',
    'On-time confirmations and a clean report record earn tokens. 100 tokens unlock VIP for 7 days.'
  ],
  how4t: ['Ազնվության վարկանիշը տեսանելի է բոլորին', 'Рейтинг честности виден всем', 'The honesty rating is public'],
  how4x: [
    'Յուրաքանչյուր քարտում՝ ժամկետում հաստատումների բաժինը և բողոքների թիվը։ Վատ վարկանիշն իջեցնում է գործակալության բոլոր հայտարարությունները։',
    'В каждой карточке — доля подтверждений в срок и число жалоб. Плохой рейтинг опускает все объявления агентства в выдаче.',
    'Every card shows on-time confirmations and reports. A poor rating sinks all of that agency listings.'
  ],
  howPractice: ['Ի՞նչ է սա փոխում գործնականում', 'Что это меняет на практике', 'What it changes in practice'],
  howPracticeX: [
    'Գործակալությանն այլևս ձեռնտու չէ զբաղված բնակարանը որպես խայծ պահել՝ հաստատումը պահանջում է սեփականատիրոջ SMS-կոդը, իսկ երեք բողոք հրապարակայնորեն իջեցնում է վարկանիշը և կասեցնում տոկենների վաստակումը։',
    'Агентству больше невыгодно держать сданную квартиру как приманку: подтверждение требует SMS-кода владельца, а три жалобы публично снижают рейтинг и останавливают заработок токенов.',
    'Agencies can no longer afford bait listings: confirmation needs the owner SMS code, and three reports publicly cut the rating and stop token earnings.'
  ],
  smsTitle: ['Հաստատեք արդիականությունը', 'Подтвердите актуальность', 'Confirm availability'],
  smsSub: [
    '{a} համարին ուղարկվել է կոդ։ Մուտքագրեք այն — հայտարարությունը կմնա ցուցակում ևս 72 ժամ։',
    'На номер {a} отправлен код. Введите его — объявление останется в выдаче ещё 72 часа.',
    'We sent a code to {a}. Enter it and the listing stays live for another 72 hours.'
  ],
  smsDone: [
    '«{x}» հաստատված է։ Ցուցակում ևս 72 ժամ',
    '«{x}» подтверждено. В выдаче ещё 72 часа',
    '"{x}" confirmed. 72 more hours in the feed'
  ]
});

Object.assign(T, {
  postTitle: ['Տեղադրել հայտարարություն', 'Разместить объявление', 'Post a listing'],
  postSub: [
    'Հրապարակումն անվճար է. հաստատեք արդիականությունը 72 ժամը մեկ, իսկ ազնիվ վարքագիծը տոկեններ է բերում VIP-ի համար։',
    'Публикация бесплатна: подтверждайте актуальность раз в 72 часа, а честное поведение приносит токены на VIP.',
    'Posting is free: confirm availability every 72 hours, and honest behavior earns tokens toward VIP.'
  ],
  stepW: ['ՔԱՅԼ', 'ШАГ', 'STEP'],
  st1: ['Տեսակ և հասցե', 'Тип и адрес', 'Type and address'],
  st2: ['Պարամետրեր և լուսանկարներ', 'Параметры и фото', 'Details and photos'],
  st3: ['Գին', 'Цена', 'Price'],
  st4: ['Սեփականության հաստատում', 'Подтверждение владения', 'Ownership check'],
  nextW: ['Հաջորդ քայլը', 'Дальше', 'Next'],
  backW: ['Հետ', 'Назад', 'Back'],
  scrollToBottomW: ['Ներքև', 'К последним сообщениям', 'Scroll to latest'],
  dealLbl: ['Գործարքի տեսակ', 'Тип сделки', 'Deal type'],
  cityLbl: ['Քաղաք', 'Город', 'City'],
  distLbl: ['Թաղամաս', 'Район', 'District'],
  streetLbl: ['Փողոց և շենք', 'Улица и дом', 'Street and building'],
  streetPh: ['Աբովյան 41', 'Абовян 41', 'Abovyan 41'],
  streetConfirmNote: [
    'Ընտրեք տարբերակը առաջարկվող ցանկից՝ որպեսզի հասցեն ստուգված լինի։',
    'Выберите вариант из подсказок — так мы убедимся, что адрес существует.',
    'Pick a match from the suggestions — this confirms the address is real.'
  ],
  postPhoneLbl: ['Հեռախոս հաստատումների համար', 'Телефон для подтверждений', 'Phone for confirmations'],
  postPhoneNote: [
    'Այս համարին կգա 72 ժամը մեկ SMS-կոդը։',
    'На этот номер будет приходить SMS-код раз в 72 часа.',
    'This number receives the SMS code every 72 hours.'
  ],
  roomsLbl: ['Սենյակներ', 'Комнат', 'Rooms'],
  areaLbl: ['Մակերես, մ²', 'Площадь, м²', 'Area, m²'],
  floorLbl: ['Հարկ', 'Этаж', 'Floor'],
  floorsLbl: ['Հարկերի քանակ', 'Этажей в доме', 'Floors total'],
  featLbl: ['Հարմարություններ', 'Удобства', 'Amenities'],
  descLbl: ['Նկարագրություն', 'Описание', 'Description'],
  descPh: ['Ինչն է կարևոր իմանալ բնակարանի մասին…', 'Что важно знать о квартире…', 'What matters about this home…'],
  photosLbl: ['Լուսանկարներ', 'Фотографии', 'Photos'],
  addPhoto: ['Ավելացնել լուսանկար', 'Добавить фото', 'Add photo'],
  photosNote: [
    'Նվազագույնը 5 լուսանկար — առանց դրանց հայտարարությունը չի հրապարակվում։',
    'Минимум 5 фотографий — без них объявление не публикуется.',
    'At least 5 photos — without them the listing will not go live.'
  ],
  photosCount: ['Բեռնված է {n} 5-ից', 'Загружено {n} из 5', '{n} of 5 uploaded'],
  addMediaBtn: ['Ավելացնել լուսանկար կամ տեսանյութ', 'Добавить фото и видео', 'Add photos & video'],
  mediaShelfNote: [
    'Բեռնված է {n} լուսանկար. նվազագույնը 5, կարող եք նշել մի քանիսը մեկ սեղմումով, նաև՝ մինչև 3 տեսանյութ։',
    'Загружено {n} фото. Минимум 5, можно выбрать сразу несколько за один раз, а также до 3 видео.',
    '{n} photos uploaded. At least 5 required, pick several at once — plus up to 3 videos.'
  ],
  priceLbl: ['Գին, ֏', 'Цена, ֏', 'Price, ֏'],
  depositLbl: ['Կանխավճար', 'Депозит', 'Deposit'],
  ownTitle: ['Ինչպե՞ս եք հաստատելու արդիականությունը', 'Как вы будете подтверждать актуальность', 'How you will confirm availability'],
  ch1: ['SMS-կոդ {p} համարին', 'SMS-код на {p}', 'SMS code to {p}'],
  ch1n: ['72 ժամը մեկ, մեկ հպումով', 'Раз в 72 часа, одно нажатие', 'Every 72 hours, one tap'],
  confPhoneEdit: ['Համարը փոխվում է պրոֆիլում', 'Номер можно изменить в профиле', 'You can change the number in your profile'],
  docTitle: ['Սեփականության փաստաթուղթ', 'Документ о владении', 'Ownership document'],
  docNote: [
    'Կադաստրի քաղվածք կամ պայմանագիր։ Ստուգում ենք ձեռքով մինչև 2 ժամ։',
    'Выписка из кадастра или договор. Проверяем вручную до 2 часов.',
    'A cadastre extract or contract. Manually reviewed within 2 hours.'
  ],
  uploadDoc: ['Բեռնել փաստաթուղթը', 'Загрузить документ', 'Upload document'],
  docOk: ['Փաստաթուղթը բեռնված է', 'Документ загружен', 'Document uploaded'],
  cadastreLbl: ['Ստուգված է կադաստրով', 'Проверено по кадастру', 'Verified via cadastre'],
  cadastrePh: ['օր.՝ AB12345678', 'напр. AB12345678', 'e.g. AB12345678'],
  cadastreNote: [
    'Կադաստրի սեփականության վկայականի պաշտպանիչ կոդը՝ մեր թիմի կողմից սեփականությունը ստուգելու համար։ Կոդը երբեք չի հրապարակվում և երևում է միայն HayHome-ին։',
    'Защитный код сертификата о собственности из кадастра — нужен только нашей команде, чтобы проверить право собственности. Код нигде не публикуется и виден только HayHome.',
    'The protection code from your cadastre ownership certificate — used only by our team to verify ownership. It is never published and is visible only to HayHome.'
  ],
  cadastreVerifiedNote: [
    'Սեփականատերը հաստատել է սեփականությունը կադաստրում, HayHome-ը ստուգել է այն։ Կոդն ինքնին երբեք չի հրապարակվում։',
    'Владелец подтвердил право собственности через кадастр, HayHome это проверил. Сам код нигде не публикуется.',
    'The owner confirmed ownership via the cadastre and HayHome checked it. The code itself is never published.'
  ],
  agreeW: [
    'Համաձայն եմ 72 ժամը մեկ հաստատել արդիականությունը և հանել հայտարարությունը գործարքից հետո։',
    'Обязуюсь подтверждать актуальность раз в 72 часа и снять объявление после сделки.',
    'I agree to confirm every 72 hours and remove the listing after the deal.'
  ],
  publishW: ['Հրապարակել', 'Опубликовать', 'Publish'],
  publishingW: ['Հրապարակվում է…', 'Публикуем…', 'Publishing…'],
  previewW: ['Նախադիտում', 'Предпросмотр', 'Preview'],
  awaitConf: ['ՍՊԱՍՈՒՄ Է ՀԱՍՏԱՏՄԱՆ', 'ЖДЁТ ПОДТВЕРЖДЕНИЯ', 'AWAITING CONFIRMATION'],
  errStreet: ['Նշեք փողոցը և շենքը', 'Укажите улицу и дом', 'Enter the street and building'],
  errStreetNotConfirmed: [
    'Ընտրեք հասցեն ցուցադրվող ցանկից, հակառակ դեպքում հասցեն չի ստուգվի',
    'Выберите адрес из списка подсказок — иначе мы не сможем проверить, что он существует',
    'Pick the address from the suggestions list — otherwise we can’t confirm it exists'
  ],
  errStreetNotFound: [
    'Նման հասցե չի գտնվել։ Մուտքագրեք փողոցը և շենքի համարը և ընտրեք տարբերակը ցուցադրվող ցանկից',
    'Такой адрес не найден. Введите улицу и дом и выберите вариант из подсказок',
    'This address wasn’t found. Enter the street and building number and pick a match from the suggestions'
  ],
  errPhone: ['Նշեք հեռախոսահամարը', 'Укажите номер телефона', 'Enter a phone number'],
  errArea: ['Նշեք մակերեսը', 'Укажите площадь', 'Enter the area'],
  errAreaRange: ['Մակերեսը պետք է լինի մինչև 3000 մ²', 'Площадь должна быть не больше 3000 м²', 'Area must be at most 3000 m²'],
  errFloor: ['Նշեք հարկը (1-ից 200)', 'Укажите этаж (от 1 до 200)', 'Enter the floor (1 to 200)'],
  errFloorsTotal: ['Նշեք հարկայնությունը (1-ից 200)', 'Укажите этажность дома (от 1 до 200)', 'Enter the number of floors (1 to 200)'],
  errFloorExceeds: [
    'Հարկը չի կարող գերազանցել հարկայնությունը',
    'Этаж не может быть больше этажности дома',
    'The floor can’t be higher than the building’s floor count'
  ],
  errStars: ['Աստղականությունը՝ 1-ից 5', 'Звёздность — от 1 до 5', 'Star rating must be 1 to 5'],
  errStreetTooLong: [
    'Հասցեն չափազանց երկար է (մինչև 120 նիշ)',
    'Адрес слишком длинный (максимум 120 символов)',
    'Address is too long (max 120 characters)'
  ],
  errDescTooLong: [
    'Նկարագրությունը չափազանց երկար է (մինչև 1500 նիշ)',
    'Описание слишком длинное (максимум 1500 символов)',
    'Description is too long (max 1500 characters)'
  ],
  errNoNegative: ['Բացասական արժեքներ չեն թույլատրվում', 'Отрицательные значения не допускаются', 'Negative values aren’t allowed'],
  errPhotos: ['Ավելացրեք առնվազն 5 լուսանկար', 'Добавьте минимум 5 фотографий', 'Add at least 5 photos'],
  errRepairCondition: ['Նշեք վերանորոգման որակը', 'Укажите качество ремонта', 'Choose the renovation condition'],
  errPrice: ['Նշեք գինը', 'Укажите цену', 'Enter a price'],
  errDoc: ['Բեռնեք սեփականության փաստաթուղթը', 'Загрузите документ о владении', 'Upload the ownership document'],
  errCadastre: ['Նշեք սերտիֆիկատի պաշտպանիչ կոդը', 'Укажите защитный код сертификата', 'Enter the certificate protection code'],
  errAgree: ['Հաստատեք պայմանները', 'Подтвердите условия', 'Accept the terms'],
  publishedToast: [
    'Հայտարարությունը ցուցակում է։ Հաջորդ հաստատումը՝ 72 ժամից։',
    'Объявление в выдаче. Следующее подтверждение — через 72 часа.',
    'Your listing is live. Next confirmation in 72 hours.'
  ],
  editedToast: ['Փոփոխությունները պահպանված են', 'Изменения сохранены', 'Changes saved'],
  editReviewToast: ['Փոփոխությունները ուղարկված են ստուգման', 'Изменения отправлены на проверку', 'Changes submitted for review'],
  pendingRevisionChip: ['Ստուգվում է խմբագրումը', 'Изменения на проверке', 'Edit under review'],
  editDisabledPending: [
    'Նոր խմբագրումն անհասանելի է, քանի դեռ նախորդը ստուգվում է',
    'Редактирование недоступно, пока предыдущая правка на проверке',
    'Editing is disabled until the previous change is reviewed'
  ],
  editPhotosLocked: [
    'Այս լուսանկարներն արդեն հրապարակված են և չեն փոփոխվում խմբագրման ժամանակ',
    'Эти фото уже опубликованы и не меняются при редактировании',
    'These photos are already published and cannot be changed while editing'
  ],
  cabTenant: ['Իմ որոնումները', 'Мои поиски', 'My search'],
  cabOwner: ['Իմ հայտարարությունները', 'Мои объявления', 'My listings'],
  cabAgency: ['Գործակալության վահանակ', 'Панель агентства', 'Agency dashboard'],
  cabTenantS: [
    'Պահպանվածները, բողոքները և նամակագրությունները մեկ տեղում։',
    'Сохранённое, жалобы и переписки в одном месте.',
    'Saved homes, reports and chats in one place.'
  ],
  cabOwnerS: [
    'Հաստատեք արդիականությունը մեկ հպումով — ազնիվ վարքագիծը տոկեններ է բերում VIP-ի համար։',
    'Подтверждайте актуальность одним нажатием — честное поведение приносит токены на VIP.',
    'Confirm with one tap — honest behavior earns tokens toward VIP.'
  ],
  cabAgencyS: [
    '{n} հայտարարություն · ազնվության վարկանիշը տեսանելի է գնորդներին',
    '{n} объявлений · рейтинг честности виден покупателям',
    '{n} listings · your honesty rating is public'
  ],
  confirmAll: ['Հաստատել բոլոր ակտիվները', 'Подтвердить все актуальные', 'Confirm all active'],
  allConfirmed: ['Ամեն ինչ հաստատված է', 'Всё подтверждено', 'All confirmed'],
  kpiLive: ['Ցուցակում է հիմա', 'В выдаче сейчас', 'Live now'],
  kpiDue: ['Պահանջում է հաստատում', 'Требуют подтверждения', 'Need confirmation'],
  kpiComp: ['Բողոքներ 90 օրում', 'Жалоб за 90 дней', 'Reports in 90 days'],
  kpiTotal: ['Հայտարարություններ ընդամենը', 'Всего объявлений', 'Total listings'],
  kpiSaved: ['Պահպանված', 'Сохранено', 'Saved'],
  kpiChats: ['Նամակագրություններ', 'Переписки', 'Chats'],
  kpiReports: ['Ուղարկված բողոքներ', 'Отправлено жалоб', 'Reports sent'],
  attTitle: ['{n} հայտարարություն պետք է հաստատել այսօր', '{n} объявления нужно подтвердить сегодня', '{n} listings need confirming today'],
  attText: [
    'Ժամկետը լրանալուց հետո հայտարարությունը թաքցվում է։ Դիտումներն ու հայտերը չեն կորչում։',
    'После истечения срока объявление скрывается. Просмотры и заявки не теряются.',
    'After the deadline the listing hides. Views and leads are kept.'
  ],
  thObject: ['Օբյեկտ', 'Объект', 'Property'],
  thStatus: ['Կարգավիճակ', 'Статус', 'Status'],
  thLeft: ['Մինչև թաքցնելը', 'До скрытия', 'Time left'],
  thViews: ['Դիտումներ', 'Просмотры', 'Views'],
  thFav: ['Ընտրանի', 'В избранном', 'Saved'],
  thComp: ['Բողոքներ', 'Жалобы', 'Reports'],
  thAct: ['Գործողություն', 'Действие', 'Action'],
  actConfirm: ['Հաստատել', 'Подтвердить', 'Confirm'],
  actConfirmed: ['Հաստատված է', 'Подтверждено', 'Confirmed'],
  actConfirming: ['Հաստատում ենք…', 'Подтверждаем…', 'Confirming…'],
  actReturn: ['Վերադարձնել ցուցակ', 'Вернуть в выдачу', 'Return to feed'],
  actAnswer: ['Պատասխանել բողոքին', 'Ответить на жалобы', 'Answer reports'],
  actRented: ['Զբաղված է', 'Сдана', 'Mark taken'],
  actEdit: ['Խմբագրել', 'Редактировать', 'Edit'],
  hiddenW: ['թաքցված', 'скрыто', 'hidden'],
  reviewW: ['ստուգման փուլում', 'на проверке', 'in review'],
  rentedToast: [
    '«Զբաղված է» — հայտարարությունը հանված է ցուցակից',
    '«Сдана» — объявление снято с публикации',
    'Marked taken — the listing is off the feed'
  ],
  returnedToast: ['Հայտարարությունը վերադարձել է ցուցակ', 'Объявление вернулось в выдачу', 'The listing is back in the feed'],
  closeDealTitleRent: ['Օբյեկտը հանձնված է', 'Объект сдан', 'Handed over'],
  closeDealTitleSale: ['Գործարքն ավարտված է', 'Сделка завершена', 'Deal closed'],
  closeDealSourceQ: ['Որտե՞ղ եք գտել հաճախորդին', 'Где нашли клиента?', 'Where did you find the tenant?'],
  closeDealDurationLessHour: ['Հրապարակումից անցել է քիչ ժամանակ', 'С публикации прошло меньше часа', 'Less than an hour since posting'],
  closeDealDurationHours: ['Հրապարակումից անցել է {n} ժ', 'С публикации прошло {n} ч', '{n}h since posting'],
  closeDealDurationDays: ['Հրապարակումից անցել է {n} օր', 'С публикации прошло {n} дн', '{n}d since posting'],
  outcomeSrcBnak: ['HayHome', 'HayHome', 'HayHome'],
  outcomeSrcOtherPlatform: ['Այլ հարթակ', 'Другая площадка', 'Another platform'],
  outcomeSrcReferral: ['Ըստ երաշխավորության', 'По рекомендации', 'Referral'],
  outcomeSrcOffline: ['Օֆլայն', 'Офлайн', 'Offline'],
  outcomeSrcOther: ['Այլ', 'Другое', 'Other'],
  teamTitle: ['Թիմ', 'Команда', 'Team'],
  teamNote: [
    'Ագենտները ցուցակ են՝ առանց առանձին մուտքի կամ իրավունքների։ Նշանակեք պատասխանատու օբյեկտների ցանկում։',
    'Агенты — это список контактов без отдельного входа и прав. Назначайте ответственного в списке объектов.',
    'Agents are a contact roster without their own login or permissions. Assign one as responsible in the listings table.'
  ],
  teamEmpty: ['Թիմում դեռ ոչ ոք չկա', 'В команде пока никого нет', 'No one on the team yet'],
  agentNameLbl: ['Անուն', 'Имя', 'Name'],
  agentPhoneLbl: ['Հեռախոս', 'Телефон', 'Phone'],
  agentNamePh: ['Անի Ակոպյան', 'Ани Акопян', 'Ani Hakobyan'],
  addAgentBtn: ['Ավելացնել գործակալ', 'Добавить агента', 'Add agent'],
  agentAddedToast: ['Գործակալն ավելացված է', 'Агент добавлен', 'Agent added'],
  errAgentNameRequired: ['Նշեք անունը', 'Укажите имя', 'Enter a name'],
  errAgentNotFound: ['Գործակալը չի գտնվել', 'Агент не найден', 'Agent not found'],
  errAgencyRoleRequired: [
    'Հասանելի է միայն գործակալության դերով հաշիվներին',
    'Доступно только аккаунтам с ролью «Агентство»',
    'Only available to agency accounts'
  ],
  responsibleAgentLbl: ['Պատասխանատու', 'Ответственный', 'Responsible'],
  noAgentW: ['Չի նշանակվել', 'Не назначен', 'Unassigned'],
  agencyStatsTitle: ['Գործակալության ցուցանիշներ', 'Показатели агентства', 'Agency metrics'],
  hRow1: ['Ակտիվ / ընդամենը', 'Активных / всего', 'Active / total'],
  hRow2: ['Բողոքներ 90 օրում', 'Жалоб за 90 дней', 'Reports in 90 days'],
  hRow3: ['Արխիվում / ընդամենը', 'В архиве / всего', 'Archived / total'],
  savedSearchT: ['Պահպանված որոնում', 'Сохранённый поиск', 'Saved search'],
  saveSearch: ['Պահպանել ընթացիկ որոնումը', 'Сохранить текущий поиск', 'Save current search'],
  savedToast: [
    'Որոնումը պահպանված է։ Նոր տարբերակների մասին կհայտնենք։',
    'Поиск сохранён. Сообщим о новых вариантах.',
    'Search saved. We will ping you about new matches.'
  ],
  searchAlreadySaved: ['Այս որոնումն արդեն պահպանված է', 'Этот поиск уже сохранён', 'This search is already saved'],
  applyW: ['Կիրառել', 'Применить', 'Apply'],
  noListings: ['Դեռ հայտարարություններ չկան', 'Объявлений пока нет', 'No listings yet'],
  noListingsS: [
    'Տեղադրեք առաջինը — 4 քայլ, մոտ 3 րոպե։',
    'Разместите первое — 4 шага, около 3 минут.',
    'Post your first one — 4 steps, about 3 minutes.'
  ],
  signOutW: ['Դուրս գալ', 'Выйти', 'Sign out'],
  editW: ['Խմբագրել', 'Редактировать', 'Edit'],
  saveW: ['Պահպանել', 'Сохранить', 'Save'],
  profileTitle: ['Պրոֆիլի խմբագրում', 'Редактирование профиля', 'Edit profile'],
  secPersonal: ['Անձնական տվյալներ', 'Личные данные', 'Personal details'],
  secPersonalSub: [
    'Այսպես ձեզ կտեսնեն հայտարարություններում և չատում',
    'Так вас увидят в объявлениях и в чате',
    'How you appear in listings and chats'
  ],
  secPhone: ['Հեռախոսահամար', 'Номер телефона', 'Phone number'],
  secPhoneSub: [
    'Օգտագործվում է մուտքի համար, փոփոխությունը հաստատվում է SMS-ով',
    'Используется для входа, смена подтверждается кодом из SMS',
    'Used to sign in, changes are confirmed by SMS'
  ],
  secSecurity: ['Անվտանգություն', 'Безопасность', 'Security'],
  secSecuritySub: [
    'Գաղտնաբառը փոխելուց հետո մյուս սարքերից դուրս կգաք',
    'После смены пароля на других устройствах будет выполнен выход',
    'Changing the password signs you out on other devices'
  ],
  firstNameLbl: ['Անուն', 'Имя', 'First name'],
  lastNameLbl: ['Ազգանուն', 'Фамилия', 'Last name'],
  nameSavedToast: ['Տվյալները պահպանված են', 'Данные сохранены', 'Details saved'],
  currentPhoneLbl: ['Ընթացիկ համար', 'Текущий номер', 'Current number'],
  newPhoneLbl: ['Նոր համար', 'Новый номер', 'New number'],
  phoneCodeSub: ['Կոդն ուղարկվել է {p} համարին', 'Код отправлен на {p}', 'Code sent to {p}'],
  phoneSavedToast: ['Համարը փոխված է', 'Номер изменён', 'Number changed'],
  currentPwLbl: ['Ընթացիկ գաղտնաբառ', 'Текущий пароль', 'Current password'],
  newPwLbl: ['Նոր գաղտնաբառ', 'Новый пароль', 'New password'],
  pwSavedToast: ['Գաղտնաբառը փոխված է', 'Пароль изменён', 'Password changed'],
  signOutConfirmQ: ['Ցանկանու՞մ եք դուրս գալ', 'Уверены, что хотите выйти?', 'Are you sure you want to sign out?'],
  signOutConfirmSub: [
    'Կրկին մուտք գործելու համար հարկավոր կլինի հեռախոսահամար և գաղտնաբառ',
    'Чтобы войти снова, понадобится номер телефона и пароль',
    "You'll need your phone number and password to sign in again"
  ],
  supportW: ['Աջակցություն', 'Поддержка', 'Support']
});

Object.assign(T, {
  backAll: ['Բոլոր հայտարարությունները', 'Все объявления', 'All listings'],
  descTitle: ['Նկարագրություն', 'Описание', 'Description'],
  videoTitle: ['Տեսանյութ', 'Видео', 'Video'],
  specsTitle: ['Բնութագրեր', 'Характеристики', 'Specs'],
  showPhone: ['Ցույց տալ հեռախոսը', 'Показать телефон', 'Show phone'],
  writeChat: ['Գրել չաթում', 'Написать в чат', 'Message the owner'],
  saveWatch: ['Ավելացնել ընտրանի', 'В избранное', 'Save to favorites'],
  inFavW: ['Ընտրանիում է', 'В избранном', 'Saved'],
  confHistory: ['Հաստատումների պատմություն · 14 օր', 'История подтверждений · 14 дней', 'Confirmation history · 14 days'],
  daysAgo14: ['14 օր առաջ', '14 дней назад', '14 days ago'],
  todayW: ['այսօր', 'сегодня', 'today'],
  confInTime: ['հաստատում ժամկետում', 'подтверждений в срок', 'on-time confirmations'],
  daysInFeed: ['օր ցուցակում', 'дней в выдаче', 'days in the feed'],
  compCount: ['բողոք «արդեն զբաղված է»', 'жалоб «уже сдана»', '"already taken" reports'],
  confBadgeFresh: [
    'Սեփականատերը հաստատել է արդիականությունը {x}',
    'Владелец подтвердил актуальность {x}',
    'The owner confirmed availability {x}'
  ],
  confBadgeFlag: ['Ստուգման փուլում՝ {n} բողոք', 'На проверке: {n} жалоб «уже сдана»', 'Under review: {n} "already taken" reports'],
  confBadgeNote: [
    'Հաստատումը SMS-կոդով սեփականատիրոջ համարից — ոչ ավտոերկարաձգում',
    'Подтверждение по SMS-коду с номера владельца — не автопродление',
    'Confirmed by SMS code from the owner phone — never auto-renewed'
  ],
  ratingHonesty: ['Ազնվության վարկանիշ', 'Рейтинг честности', 'Honesty rating'],
  scoreGood: [
    'Ժամկետում հաստատում է {a}-ից {b}։ Բողոքներ՝ {c}։',
    'Подтверждает в срок {a} из {b}. Жалоб «уже сдана»: {c}.',
    'Confirms on time {a} of {b}. Reports: {c}.'
  ],
  scoreBad: [
    'Հաճախ չի հանում զբաղված հայտարարությունները՝ {c} հաստատված բողոք։ Ճշտեք հասցեն մեկնելուց առաջ։',
    'Часто не снимает объявления после сдачи: {c} подтверждённых жалоб. Уточните адрес до выезда.',
    'Often leaves taken listings up: {c} upheld reports. Double-check before travelling.'
  ],
  onHayHomeSince: ['HayHome-ում {y}-ից', 'на HayHome с {y}', 'on HayHome since {y}'],
  statViews: ['{n} դիտում', '{n} просмотр|{n} просмотра|{n} просмотров', '{n} view|{n} views'],
  statFavorites: ['{n} ընտրանիում', '{n} в избранном', '{n} saved'],
  statPostedOn: ['Հրապարակվել է {x}', 'Размещено {x}', 'Posted {x}'],
  statPostedUnknown: ['Ամսաթիվն անհայտ է', 'Дата размещения неизвестна', 'Posting date unknown'],
  reportBoxTitle: [
    'Զանգահարեցի՞ք, իսկ բնակարանն «արդեն զբաղված է»',
    'Позвонили — а квартиру «уже сдали»?',
    'Called and heard it is already taken?'
  ],
  reportBoxText: [
    'Հայտնեք։ Մենք հարցում կուղարկենք սեփականատիրոջը, իսկ մինչ պատասխանը հայտարարությունը դուրս կգա ցուցակից։',
    'Сообщите. Мы запросим подтверждение у владельца, а до ответа объявление уйдёт из выдачи.',
    'Tell us. We ask the owner to confirm, and the listing leaves the feed until they answer.'
  ],
  reportCta: ['Հայտնել անհասանելի բնակարանի մասին', 'Сообщить о недоступной квартире', 'Report an unavailable home'],
  reportFine: [
    'Բողոքն անանուն է։ Կեղծ բողոքների համար հաշիվը սահմանափակվում է։',
    'Жалоба анонимна. За ложные жалобы аккаунт ограничивается.',
    'Reports are anonymous. False reports limit your account.'
  ],
  similarTitle: ['Նման ազատ տարբերակներ', 'Похожие живые варианты', 'Similar available homes'],
  locationTitle: ['Տեղադրությունը քարտեզի վրա', 'Расположение на карте', 'Location on the map'],
  locationNoCoords: [
    'Ճշգրիտ կոորդինատները հասանելի չեն այս պահին',
    'Точные координаты сейчас недоступны',
    'Precise coordinates are not available right now'
  ],
  locationSearchCta: ['Փնտրել հասցեն Yandex Քարտեզներում', 'Найти адрес в Яндекс Картах', 'Search the address on Yandex Maps'],
  locationOpenCta: ['Բացել կետը քարտեզի վրա', 'Открыть точку на карте', 'Open the pin on the map'],
  locationLoading: ['Քարտեզը բեռնվում է…', 'Карта загружается…', 'Loading the map…'],
  locationMapUnavailable: ['Քարտեզը ժամանակավորապես անհասանելի է', 'Карта временно недоступна', 'The map is temporarily unavailable'],
  locationOpenYandex: ['Բացել Yandex Քարտեզներում', 'Открыть в Яндекс Картах', 'Open in Yandex Maps'],
  locationRetry: ['Կրկին փորձել', 'Повторить', 'Retry'],
  locationDevNoKey: [
    'VITE_YANDEX_MAPS_API_KEY բացակայում է (.env.local)',
    'Не задан VITE_YANDEX_MAPS_API_KEY (.env.local)',
    'VITE_YANDEX_MAPS_API_KEY is missing (.env.local)'
  ],
  locationDevSdkError: [
    'SDK-ի սխալ. ստուգեք բանալին և HTTP Referer allowlist-ը',
    'Ошибка SDK: проверьте ключ и allowlist HTTP Referer',
    'SDK error: check the API key and HTTP Referer allowlist'
  ],
  locationDevTimeout: ['Ժամանակը լրացավ բեռնման ընթացքում', 'Истёк таймаут загрузки', 'Load timed out'],
  locationDevInitError: ['Քարտեզի սկզբնավորման սխալ', 'Ошибка инициализации карты', 'Map init error'],
  photoOf: ['Լուսանկար {a}-ը {b}-ից', 'Фото {a} из {b}', 'Photo {a} of {b}'],
  allPhotos: ['Բոլոր լուսանկարները', 'Все фото', 'All photos'],
  kDeal: ['Գործարքի տեսակ', 'Тип сделки', 'Deal type'],
  kRooms: ['Սենյակ', 'Комнат', 'Rooms'],
  kArea: ['Մակերես', 'Площадь', 'Area'],
  kFloor: ['Հարկ', 'Этаж', 'Floor'],
  kReno: ['Վերանորոգում', 'Ремонт', 'Condition'],
  repairUnspecified: ['Նշված չէ', 'Не указано', 'Not specified'],
  repairInfoLabel: ['Վերանորոգման մակարդակների բացատրություն', 'Пояснение уровней ремонта', 'Explanation of renovation levels'],
  kFurn: ['Կահույք', 'Мебель', 'Furniture'],
  kDeposit: ['Կանխավճար', 'Депозит', 'Deposit'],
  kUtil: ['Կոմունալ', 'Коммунальные', 'Utilities'],
  kWho: ['Ով է հանձնում', 'Кто сдаёт', 'Listed by'],
  kPromo: ['Առաջխաղացում', 'Продвижение', 'Promotion'],
  vLong: ['Երկարաժամկետ վարձակալություն', 'Долгосрочная аренда', 'Long-term rent'],
  vDaily: ['Օրավարձով', 'Посуточно', 'Daily rent'],
  vSale: ['Վաճառք', 'Продажа', 'Sale'],
  vNew: ['Նորակառույց', 'Новостройка', 'New build'],
  vComm: ['Առևտրային', 'Коммерческая', 'Commercial'],
  vYes: ['կա', 'есть', 'yes'],
  vNo: ['չկա', 'нет', 'no'],
  vOneMonth: ['1 ամիս', '1 месяц', '1 month'],
  vMeters: ['ըստ հաշվիչների', 'по счётчикам', 'by meter'],
  vTokens: ['տոկեններով', 'за токены', 'via tokens'],
  descBody: [
    'Լուսավոր բնակարան {d} թաղամասում։ Պատուհանները դեպի բակ, հանգիստ է։ Մոտակայքում՝ խանութ, դեղատուն և կանգառ։',
    'Светлая квартира в районе {d}. Окна во двор, тихо. Рядом продуктовый, аптека и остановка.',
    'A bright home in {d}. Courtyard windows, quiet. Shop, pharmacy and bus stop nearby.'
  ],
  descBody2: [
    'Կանխավճարը մեկ ամիս է, կոմունալը՝ ըստ հաշվիչների։ Սեփականատերը խոսում է հայերեն և ռուսերեն, ցուցադրությունը հնարավոր է դիմելու օրը։',
    'Депозит — один месяц, коммунальные по счётчикам. Владелец говорит на армянском и русском, показ возможен в день обращения.',
    'Deposit is one month, utilities by meter. The owner speaks Armenian and Russian; viewings same day.'
  ],
  favTitle: ['Ընտրանի', 'Избранное', 'Saved homes'],
  favSub: [
    'Հետևում ենք պահպանվածների կարգավիճակին և զգուշացնում, երբ որևէ բան դուրս է գալիս ցուցակից։',
    'Следим за статусом сохранённых квартир и предупреждаем, когда что-то уходит из выдачи.',
    'We watch your saved homes and warn you when one leaves the feed.'
  ],
  favEmpty: ['Դեռ ոչինչ չկա', 'Здесь пока пусто', 'Nothing saved yet'],
  favEmptyText: [
    'Սեղմեք սրտիկը ցանկացած հայտարարության վրա — կհետևենք դրա արդիականությանը։',
    'Нажмите на сердечко в любом объявлении — будем следить за его актуальностью.',
    'Tap the heart on any listing — we will track its freshness for you.'
  ],
  favAlertTitle: ['Պահպանվածներից 1-ը գնացել է արխիվ', '1 из сохранённых ушло в архив', '1 saved home moved to the archive'],
  favAlertText: [
    '«2 սեն., 54 մ²» Մաշտոց պող.-ում — սեփականատերը 4 օր չի հաստատել արդիականությունը։',
    '«2 комн., 54 м²» на Маштоц просп. — владелец не подтвердил актуальность 4 дня.',
    '"2 rooms, 54 m²" on Mashtots — the owner has not confirmed for 4 days.'
  ],
  inFeedChip: ['Արդիական է', 'Актуально', 'Up to date'],
  archChip: ['Արխիվ · ցուցակից դուրս', 'Архив · вне выдачи', 'Archived · out of feed'],
  checkedAt: ['Ստուգված {x}', 'Проверено {x}', 'Checked {x}'],
  archNote2: [
    'Սեփականատերը 4 օր չի հաստատել — հանել ենք ցուցակից',
    'Владелец не подтвердил 4 дня — убрали из выдачи',
    'No confirmation for 4 days — removed from the feed'
  ],
  removeW: ['Հեռացնել', 'Убрать', 'Remove'],
  archOpenToast: [
    'Հայտարարությունն արխիվում է. կապ հաստատել հնարավոր չէ',
    'Объявление в архиве: связаться нельзя, пока владелец не подтвердит',
    'Archived listing: you cannot contact the owner until they confirm'
  ],
  phoneToast: [
    'Հեռախոսը բացված է։ Սեփականատերը հաստատել է {x}',
    'Телефон открыт. Владелец подтвердил актуальность {x}',
    'Phone revealed. The owner confirmed {x}'
  ]
});

Object.assign(T, {
  micTitle: ['Ձայնային հաղորդագրություն', 'Голосовое сообщение', 'Voice message'],
  videoTitle: ['Տեսանյութ', 'Видео', 'Video'],
  emojiTitle: ['Սմայլիկներ', 'Смайлики', 'Emoji'],
  micDenied: ['Մուտքը խոսափողին մերժված է', 'Нет доступа к микрофону', 'Microphone access denied'],
  recCancel: ['Չեղարկել ձայնագրումը', 'Отменить запись', 'Cancel recording'],
  recSend: ['Կանգնեցնել և ուղարկել', 'Остановить и отправить', 'Stop and send'],
  audioMsg: ['Ձայնային հաղորդագրություն', 'Голосовое сообщение', 'Voice message'],
  attachTitle: ['Կցել', 'Прикрепить', 'Attach'],
  attachPhoto: ['Լուսանկար', 'Фото', 'Photo'],
  attachVideo: ['Տեսանյութ', 'Видео', 'Video'],
  attachDoc: ['Փաստաթուղթ', 'Документ', 'Document'],
  attachLoc: ['Տեղադրություն', 'Геолокация', 'Location'],
  imgMsg: ['Լուսանկար', 'Фото', 'Photo'],
  fileMsg: ['Փաստաթուղթ', 'Документ', 'Document'],
  locMsg: ['Ընթացիկ տեղադրություն', 'Текущая геопозиция', 'Current location'],
  locOpen: ['Բացել քարտեզի վրա', 'Открыть на карте', 'Open on map'],
  youPrefix: ['Դուք՝', 'Вы:', 'You:'],
  geoDenied: ['Տեղադրությունը հասանելի չէ', 'Геолокация недоступна', 'Location unavailable'],
  chatBack: ['Հետ', 'Назад', 'Back'],
  netErr: ['Սերվերը անհասանելի է', 'Сервер недоступен, проверьте подключение', 'Server unavailable, check your connection']
});

Object.assign(T, {
  errBadJson: ['Սխալ ձևաչափի հարցում', 'Некорректный запрос', 'Malformed request'],
  errInvalidPhone: ['Անվավեր հեռախոսահամար', 'Некорректный номер телефона', 'Invalid phone number'],
  errDbError: ['Սերվերի սխալ, փորձեք կրկին', 'Ошибка сервера, попробуйте ещё раз', 'Server error, please try again'],
  errSmsFailed: [
    'SMS-ը չուղարկվեց, փորձեք կրկին',
    'Не удалось отправить SMS, попробуйте ещё раз',
    "Couldn't send the SMS, please try again"
  ],
  errTooManyRequests: ['Սպասեք {n} վրկ և կրկին փորձեք', 'Подождите {n} сек. и попробуйте снова', 'Wait {n}s and try again'],
  errCodeNotRequested: ['Նախ պահանջեք կոդ', 'Сначала запросите код', 'Request a code first'],
  errCodeExpired: ['Կոդի ժամկետը լրացել է, պահանջեք նորը', 'Код устарел, запросите новый', 'Code expired, request a new one'],
  errWrongCode: ['Սխալ կոդ', 'Неверный код', 'Wrong code'],
  errWrongPassword: ['Ընթացիկ գաղտնաբառը սխալ է', 'Неверный текущий пароль', 'Current password is incorrect'],
  errInvalidPassword: [
    'Գաղտնաբառը պետք է լինի առնվազն 8 նիշ',
    'Пароль должен быть не короче 8 символов',
    'Password must be at least 8 characters'
  ],
  errPhoneNotVerified: [
    'Հաստատեք հեռախոսահամարը կոդով',
    'Сначала подтвердите номер кодом из SMS',
    'Confirm your phone number with the code first'
  ],
  errPhoneTaken: [
    'Այս համարով հաշիվն արդեն գրանցված է',
    'Аккаунт с этим номером уже зарегистрирован',
    'An account with this number already exists'
  ],
  errLegalRequired: [
    'Հաստատեք համաձայնությունը պայմաններին՝ շարունակելու համար',
    'Подтвердите согласие с условиями, чтобы продолжить',
    'Confirm your consent to the terms to continue'
  ],
  errLegalVersion: [
    'Փաստաթղթերը թարմացվել են, հաստատեք համաձայնությունը կրկին',
    'Документы обновились, подтвердите согласие ещё раз',
    'The documents were updated, please confirm your consent again'
  ],
  errLegalLanguage: ['Անվավեր լեզու', 'Некорректный язык', 'Invalid language'],
  errInvalidCredentials: [
    'Անվավեր հեռախոսահամար կամ գաղտնաբառ',
    'Неверный номер телефона или пароль',
    'Incorrect phone number or password'
  ],
  errUserNotFound: ['Օգտատերը չի գտնվել', 'Пользователь не найден', 'User not found'],
  errAccountBlocked: ['Հաշիվն արգելափակված է', 'Аккаунт заблокирован', 'This account has been blocked'],
  errNotAuthenticated: ['Անհրաժեշտ է մուտք գործել', 'Нужно войти в аккаунт', 'Please sign in'],
  errNotFound: ['Չի գտնվել', 'Не найдено', 'Not found'],
  errInvalidStatus: ['Անվավեր կարգավիճակ', 'Некорректный статус', 'Invalid status'],
  errListingRequired: ['Լրացրեք հասցեն, գինը և մակերեսը', 'Заполните улицу, цену и площадь', 'Fill in the street, price and area'],
  errCadastreRequired: ['Անհրաժեշտ է կադաստրի սերտիֆիկատի կոդը', 'Нужен код сертификата кадастра', 'Cadastre certificate code is required'],
  errNotYourListing: ['Սա ձեր հայտարարությունը չէ', 'Это не ваше объявление', 'This is not your listing'],
  errListingNotFound: ['Հայտարարությունը չի գտնվել', 'Объявление не найдено', 'Listing not found'],
  errBadForm: ['Սխալ ձևաչափի ֆայլ', 'Некорректная форма файла', 'Malformed file upload'],
  errRequestTooLarge: ['Հարցումը չափազանց մեծ է', 'Запрос слишком большой', 'Request is too large'],
  errDocType: [
    'Թույլատրվում են միայն PDF, JPEG կամ PNG ֆայլեր',
    'Разрешены только файлы PDF, JPEG или PNG',
    'Only PDF, JPEG or PNG files are allowed'
  ],
  errDocSize: ['Ֆայլը դատարկ է կամ գերազանցում է 10 ՄԲ-ը', 'Файл пустой или превышает 10 МБ', 'The file is empty or exceeds 10 MB'],
  errNoPhoto: ['Ընտրեք լուսանկար', 'Выберите файл фото', 'Choose a photo file'],
  errMissingUrl: ['Բացակայում է հասցեն (URL)', 'Не указан адрес файла', 'Missing file URL'],
  errNoFile: ['Ընտրեք ֆայլ', 'Выберите файл', 'Choose a file'],
  errSaveFailed: ['Չհաջողվեց պահպանել ֆայլը', 'Не удалось сохранить файл', 'Failed to save the file'],
  errThreadNotFound: ['Զրույցը չի գտնվել', 'Переписка не найдена', 'Conversation not found'],
  errNotParticipant: ['Դուք այս զրույցի մասնակից չեք', 'Вы не участник этой переписки', 'You’re not a participant in this conversation'],
  errMessageSelf: ['Չեք կարող գրել ինքներդ ձեզ', 'Нельзя написать самому себе', 'You can’t message yourself'],
  errEmptyMessage: ['Հաղորդագրությունը դատարկ է', 'Сообщение пустое', 'Message is empty'],
  errNoChanges: ['Փոփոխություններ չկան', 'Изменений нет', 'No changes made'],
  errRevisionPending: ['Դեռ ստուգվում է նախորդ խմբագրումը', 'Предыдущая правка ещё на проверке', 'A previous edit is still under review'],
  errChangesRequireReview: [
    'Լուսանկարները փոփոխվում են միայն ստուգումից առաջ',
    'Фото можно менять только до первичной модерации',
    'Photos can only change before the first review'
  ]
});

Object.assign(T, {
  cadastreCodeW: ['Կոդ', 'Код', 'Code']
});

Object.assign(T, {
  pwTitle: ['Ստեղծեք գաղտնաբառ', 'Придумайте пароль', 'Create a password'],
  pwSub: [
    'Առնվազն 8 նիշանոց գաղտնաբառ՝ հաջորդ մուտքերի համար։ Այն այլևս SMS-կոդ չի պահանջի։',
    'Пароль не короче 8 символов — он понадобится для следующих входов, уже без SMS-кода.',
    'A password of at least 8 characters for future logins — no SMS code needed after this.'
  ],
  pwLbl: ['Գաղտնաբառ', 'Пароль', 'Password'],
  pwPh: ['Առնվազն 8 նիշ', 'Не менее 8 символов', 'At least 8 characters'],
  pwErr: ['Առնվազն 8 նիշ', 'Не менее 8 символов', 'At least 8 characters'],
  pwConfirmLbl: ['Կրկնեք գաղտնաբառը', 'Повторите пароль', 'Confirm password'],
  pwConfirmPh: ['Կրկնեք գաղտնաբառը', 'Повторите пароль', 'Repeat the password'],
  pwMismatch: ['Գաղտնաբառերը չեն համընկնում', 'Пароли не совпадают', 'Passwords don’t match'],
  pwWeak: ['Թույլ', 'Слабый', 'Weak'],
  pwMedium: ['Միջին', 'Средний', 'Medium'],
  pwStrong: ['Ուժեղ', 'Сильный', 'Strong'],
  pwShow: ['Ցույց տալ', 'Показать', 'Show'],
  pwHide: ['Թաքցնել', 'Скрыть', 'Hide'],
  nextW: ['Հաջորդը', 'Далее', 'Next'],
  loginTitle: ['Բարի վերադարձ', 'С возвращением', 'Welcome back'],
  loginSub: ['Մուտքագրեք {p} հաշվի գաղտնաբառը', 'Введите пароль от аккаунта {p}', 'Enter the password for {p}'],
  loginBtn: ['Մուտք', 'Войти', 'Sign in'],
  forgotPw: ['Մոռացե՞լ եք գաղտնաբառը', 'Забыли пароль?', 'Forgot password?'],
  forgotTitle: ['Վերականգնել գաղտնաբառը', 'Восстановление пароля', 'Reset password'],
  forgotSub: [
    'Մուտքագրեք հեռախոսահամարը — կուղարկենք SMS-կոդ',
    'Введите номер телефона — пришлём код по SMS',
    'Enter your phone number — we’ll text you a code'
  ],
  resetTitle: ['Նոր գաղտնաբառ', 'Новый пароль', 'New password'],
  resetSub: [
    'Կոդը հաստատված է։ Ստեղծեք նոր գաղտնաբառ (առնվազն 8 նիշ) {p} համարի համար։',
    'Код подтверждён. Придумайте новый пароль (не менее 8 символов) для {p}.',
    'Code confirmed. Create a new password (at least 8 characters) for {p}.'
  ],
  resetBtn: ['Պահպանել և մուտք գործել', 'Сохранить и войти', 'Save and sign in'],
  countrySearchPh: ['Երկիր կամ կոդ', 'Страна или код', 'Country or code']
});

Object.assign(T, {
  walletTitle: ['Տոկեններ և VIP', 'Токены и VIP', 'Tokens & VIP'],
  walletBalanceLabel: ['տոկեն', 'токенов', 'tokens'],
  walletPrice: ['{cost} տոկեն = VIP {days} օրով', '{cost} токенов = VIP на {days} дней', '{cost} tokens = VIP for {days} days'],
  walletHistory: ['Վերջին գործառնությունները', 'Последние операции', 'Recent activity'],
  walletEmpty: ['Տոկեններ դեռ չկան', 'Токенов пока нет', 'No tokens yet'],
  walletNoTx: ['Գործառնություններ դեռ չկան', 'Операций пока нет', 'No activity yet'],
  walletToVip: ['VIP-ից առաջ մնաց {n}', 'до VIP осталось {n}', '{n} to VIP'],
  walletVipReady: ['VIP հասանելի է', 'VIP доступно', 'VIP available'],
  retryW: ['Կրկնել', 'Повторить', 'Retry'],
  vipActivate: ['Ակտիվացնել VIP', 'Активировать VIP', 'Activate VIP'],
  vipActive: ['VIP ակտիվ է', 'VIP активно', 'VIP active'],
  vipActivatedToast: ['VIP ակտիվացված է', 'VIP активирован', 'VIP activated'],
  vipCheckingW: ['Ստուգում ենք մնացորդը…', 'Проверяем баланс…', 'Checking balance…'],
  vipPromoteCost: ['Բարձրացնել որոնման մեջ · {cost} տոկեն', 'Поднять в поиске · {cost} токенов', 'Boost in search · {cost} tokens'],
  vipMissingTokens: [
    'Բարձրացնել որոնման մեջ · չի բավականացնում {n} տոկեն',
    'Поднять в поиске · не хватает {n} токенов',
    'Boost in search · missing {n} tokens'
  ],
  vipInsufficientToast: ['VIP-ի համար չի բավականացնում {n} տոկեն', 'Не хватает {n} токенов до VIP', 'You need {n} more tokens for VIP'],
  vipLeftDays: ['{d} օր {h} ժ', '{d} дн {h} ч', '{d}d {h}h'],
  vipLeftHours: ['{h} ժ {m} ր', '{h} ч {m} мин', '{h}h {m}m'],
  vipLeftMinutes: ['{m} ր', '{m} мин', '{m}m'],
  errListingNotActive: ['Հայտարարությունն ակտիվ չէ', 'Объявление сейчас не активно', 'The listing is not active right now'],
  errVipActive: ['VIP-ն արդեն ակտիվ է', 'VIP уже активирован', 'VIP is already active'],
  errTokensInsufficient: ['Բավարար տոկեններ չկան', 'Недостаточно токенов', 'Not enough tokens'],
  errInvalidSource: ['Ընտրեք, թե որտեղ եք գտել հաճախորդին', 'Выберите, где нашли клиента', 'Choose where you found the tenant'],
  txKindSignup: ['Գրանցում', 'Регистрация', 'Sign up bonus'],
  txKindProfile: ['Պրոֆիլի լրացում', 'Заполнение профиля', 'Profile completed'],
  txKindApproved: ['Հայտարարության հաստատում', 'Одобрение объявления', 'Listing approved'],
  txKindCadastre: ['Կադաստրի ստուգում', 'Проверка по кадастру', 'Cadastre verified'],
  txKindPhotos: ['Որակյալ լուսանկարներ', 'Качественные фото', 'Quality photos'],
  txKindVip: ['VIP ակտիվացում', 'Активация VIP', 'VIP activation'],
  txKindMarkTaken: ['Հայտարարությունը նշված է որպես զբաղված', 'Объявление помечено как занятое', 'Marked listing as taken'],
  txKindUsefulReport: ['Օգտակար բողոք', 'Полезная жалоба', 'Useful report'],
  txKindOther: ['Այլ գործառնություն', 'Другая операция', 'Other activity']
});

Object.assign(T, {
  legalTitle: ['Իրավական տեղեկատվություն', 'Правовая информация', 'Legal'],
  legalPrivacy: ['Գաղտնիության քաղաքականություն', 'Политика конфиденциальности', 'Privacy policy'],
  legalTerms: ['Օգտագործման պայմանագիր', 'Пользовательское соглашение', 'Terms of use'],
  legalPersonalData: ['Անձնական տվյալների մշակում', 'Обработка персональных данных', 'Personal data processing'],
  legalCookies: ['Cookie ֆայլեր', 'Cookie', 'Cookies'],
  legalListingRules: ['Հայտարարությունների և մոդերացիայի կանոններ', 'Правила объявлений и модерации', 'Listing and moderation rules'],
  legalTokenRules: ['Տոկենների և VIP կանոններ', 'Правила токенов и VIP', 'Token and VIP rules'],
  legalComplaints: ['Բողոքներ և անվտանգություն', 'Жалобы и безопасность', 'Complaints and safety'],
  legalContacts: ['Կոնտակտներ և օպերատորի տվյալներ', 'Контакты и реквизиты оператора', 'Contacts and operator details'],
  legalUpdated: ['Թարմացվել է {x}', 'Обновлено {x}', 'Updated {x}'],
  legalOpen: ['Բացել', 'Открыть', 'Open'],
  legalBack: ['Ետ', 'Назад', 'Back'],
  legalToList: ['Բոլոր փաստաթղթերը', 'К списку документов', 'Back to documents'],
  legalListSub: [
    'HayHome-ի աշխատանքի հիմնական կանոնները՝ ըստ բաժինների',
    'Основные правила работы HayHome по разделам',
    'HayHome’s core rules of operation, by section'
  ],
  legalNotFoundTitle: ['Փաստաթուղթը չի գտնվել', 'Документ не найден', 'Document not found'],
  legalNotFoundText: [
    'Նման փաստաթուղթ գոյություն չունի։ Ընտրեք ցանկից ստորև։',
    'Такого документа не существует. Выберите из списка ниже.',
    'No such document exists. Choose one from the list below.'
  ],
  legalBetaNote: [
    'HayHome-ը գտնվում է բետա փուլում. այս փաստաթղթերը նկարագրում են ծառայության փաստացի աշխատանքը և չեն հանդիսանում իրավաբանական խորհրդատվություն։',
    'HayHome находится на этапе беты. Эти документы описывают фактическую работу сервиса и не являются юридической консультацией.',
    'HayHome is in beta. These documents describe how the service actually operates and are not legal advice.'
  ],
  rateDateLabel: ['ՀՀ ԿԲ կուրսը՝ {x}-ի դրությամբ', 'Курс ЦБ РА на {x}', 'CBA rate as of {x}'],
  rateStale: ['Կուրսը հնացած է', 'Курс устарел', 'Rate is outdated'],
  consentAccept: ['Ընդունում եմ', 'Принимаю', 'I accept'],
  consentTerms: ['օգտագործման պայմանագիրը', 'пользовательское соглашение', 'the terms of use'],
  consentPrivacy: ['գաղտնիության քաղաքականությունը', 'политику конфиденциальности', 'the privacy policy'],
  consentPersonalData: ['անձնական տվյալների մշակումը', 'обработку персональных данных', 'personal data processing'],
  consentAnd: [' և ', ' и ', ' and ']
});

Object.assign(T, {
  hotel: ['Հյուրանոցներ', 'Отели', 'Hotels'],
  titleHotel: ['Հյուրանոցներ և հոսթելներ', 'Отели и хостелы', 'Hotels and hostels'],
  titleAll: ['Բոլոր հայտարարությունները', 'Все объявления', 'All listings'],
  vHotel: ['Հյուրանոց / հոսթել', 'Отель / хостел', 'Hotel / hostel'],
  perNight: ['/ գիշեր', '/ ночь', '/ night'],
  kindHotel: ['Հյուրանոց', 'Отель', 'Hotel'],
  kindHostel: ['Հոսթել', 'Хостел', 'Hostel'],
  kindGuesthouse: ['Հյուրատուն', 'Гостевой дом', 'Guesthouse'],
  hotelW: ['Հյուրանոց', 'Отель', 'Hotel'],
  roleHotel: ['Հյուրանոց / հոսթել', 'Отель / хостел', 'Hotel / hostel'],
  roleHotelN: [
    'Համարներ, օրացույց, ամրագրման հարցումներ',
    'Номера, календарь, запросы на бронирование',
    'Rooms, calendar, booking requests'
  ],
  hotelNameLbl: ['Անվանումը', 'Название', 'Property name'],
  hotelNamePh: ['Օրինակ՝ Ararat Hostel', 'Например, Ararat Hostel', 'e.g. Ararat Hostel'],
  starsLbl: ['Աստղականություն (ըստ ցանկության)', 'Звёздность (по желанию)', 'Star rating (optional)'],
  stayKindLbl: ['Օբյեկտի տեսակը', 'Тип объекта', 'Property type'],
  checkInLbl: ['Մուտք', 'Заезд', 'Check-in'],
  checkOutLbl: ['Ելք', 'Выезд', 'Check-out'],
  guestsLbl: ['Հյուրեր', 'Гости', 'Guests'],
  checkInTimeLbl: ['Մուտքի ժամը', 'Время заезда', 'Check-in time'],
  checkOutTimeLbl: ['Ելքի ժամը', 'Время выезда', 'Check-out time'],
  kStayKind: ['Տեսակը', 'Тип', 'Type'],
  kCheckTimes: ['Մուտք / ելք', 'Заезд / выезд', 'Check-in / out'],
  kRoomTypes: ['Համարների տեսակներ', 'Типов номеров', 'Room types'],
  nightWord: ['գիշեր', 'ночь|ночи|ночей', 'night|nights'],
  nightsN: ['{n} գիշեր', '{n} ночь|{n} ночи|{n} ночей', '{n} night|{n} nights'],
  guestWord: ['հյուր', 'гость|гостя|гостей', 'guest|guests'],
  upToGuests: ['մինչև {n} հյուր', 'до {n} гостя|до {n} гостей|до {n} гостей', 'up to {n} guest|up to {n} guests'],
  forNights: ['{n} գիշերվա համար', 'за {n} ночь|за {n} ночи|за {n} ночей', 'for {n} night|for {n} nights'],
  fromPerNight: ['{x} ֏-ից / գիշեր', 'от {x} ֏ / ночь', 'from {x} ֏ / night'],
  perDayPrice: ['{x} ֏ / օր', '{x} ֏ / сутки', '{x} ֏ / night'],
  freeForDates: ['Ազատ է ձեր ամսաթվերին', 'Свободно на ваши даты', 'Available for your dates'],
  roomsTitle: ['Համարներ', 'Номера', 'Rooms'],
  bathPrivate: ['Սեփական սանհանգույց', 'Свой санузел', 'Private bathroom'],
  bathShared: ['Ընդհանուր սանհանգույց', 'Общий санузел', 'Shared bathroom'],
  breakfastIncl: ['Նախաճաշը ներառված է', 'Завтрак включён', 'Breakfast included'],
  roomsLeft: ['Մնացել է՝ {n}', 'Осталось: {n}', '{n} left'],
  soldOut: ['Ձեր ամսաթվերին ազատ չէ', 'Нет мест на ваши даты', 'Not available for your dates'],
  tooManyGuests: [
    'Համարը նախատեսված չէ այդքան հյուրի համար',
    'Номер не рассчитан на столько гостей',
    'This room doesn’t fit that many guests'
  ],
  requestBookingBtn: ['Հարցնել ամրագրում', 'Запросить бронирование', 'Request booking'],
  bookingNoPay: [
    'Հիմա վճարել պետք չէ. հյուրանոցը կհաստատի հարցումը չաթում',
    'Платить сейчас не нужно — отель подтвердит запрос в чате',
    'No payment now — the hotel confirms your request in chat'
  ],
  bookingSentToast: ['Հարցումն ուղարկված է հյուրանոցին', 'Запрос отправлен отелю', 'Request sent to the hotel'],
  noRoomsYet: ['Համարները դեռ ավելացված չեն', 'Номера пока не добавлены', 'No rooms added yet'],
  hotelRoomsLater: [
    'Համարները և գները կավելացնեք հրապարակումից անմիջապես հետո՝ աշխատասեղանում',
    'Номера и цены добавите сразу после публикации — в кабинете',
    'You’ll add rooms and prices right after publishing, in your dashboard'
  ],
  hotelDocNote: [
    'Կցեք ԱՁ/ՍՊԸ գրանցման վկայականը կամ սեփականության փաստաթուղթը։ Այն տեսնում է միայն մոդերացիան։',
    'Приложите свидетельство о регистрации ИП/ООО или документ о праве собственности. Его видит только модерация.',
    'Attach your business registration or ownership document. Only moderators see it.'
  ],
  cabHotel: ['Իմ օբյեկտները', 'Мои объекты', 'My properties'],
  cabHotelS: [
    'Համարներ, օրացույց և ամրագրման հարցումներ',
    'Номера, календарь и запросы на бронирование',
    'Rooms, calendar and booking requests'
  ],
  addHotel: ['Ավելացնել օբյեկտ', 'Добавить объект', 'Add property'],
  allActual: ['Ամեն ինչ արդիական է', 'Всё актуально', 'All up to date'],
  tabRooms: ['Համարներ', 'Номера', 'Rooms'],
  tabCalendar: ['Օրացույց', 'Календарь', 'Calendar'],
  tabRequests: ['Հարցումներ', 'Запросы', 'Requests'],
  addRoom: ['Ավելացնել համար', 'Добавить номер', 'Add room'],
  tplSingle: ['Մեկտեղանոց', 'Одноместный', 'Single'],
  tplDouble: ['Երկտեղանոց', 'Двухместный', 'Double'],
  tplFamily: ['Ընտանեկան', 'Семейный', 'Family'],
  tplDorm: ['Տեղ ընդհանուր սենյակում', 'Место в общем номере', 'Dorm bed'],
  roomNameLbl: ['Անվանումը', 'Название', 'Name'],
  roomCapacityLbl: ['Տեղեր', 'Мест', 'Sleeps'],
  roomQuantityLbl: ['Քանակ', 'Сколько таких', 'How many'],
  roomPriceLbl: ['Գինը գիշերվա համար, ֏', 'Цена за ночь, ֏', 'Price per night, ֏'],
  bathroomLbl: ['Սանհանգույց', 'Санузел', 'Bathroom'],
  breakfastLbl: ['Նախաճաշ', 'Завтрак', 'Breakfast'],
  duplicateW: ['Կրկնօրինակել', 'Дублировать', 'Duplicate'],
  deleteW: ['Ջնջել', 'Удалить', 'Delete'],
  roomSavedToast: ['Համարը պահպանված է', 'Номер сохранён', 'Room saved'],
  roomDeletedToast: ['Համարը ջնջված է', 'Номер удалён', 'Room deleted'],
  roomsNeeded: [
    'Ավելացրեք համարներ, որպեսզի օբյեկտը հայտնվի որոնման մեջ',
    'Добавьте номера, чтобы объект появился в поиске',
    'Add rooms so the property shows up in search'
  ],
  calHint: [
    'Սեղմեք օրերին, հետո փակեք կամ բացեք ընտրվածները',
    'Выделите дни и закройте или откройте их',
    'Select days, then close or open them'
  ],
  calClosed: ['Փակ', 'Закрыто', 'Closed'],
  calFree: ['{a}/{b}', '{a} из {b}', '{a} of {b}'],
  closeSelected: ['Փակել', 'Закрыть выбранные', 'Close selected'],
  openSelected: ['Բացել', 'Открыть выбранные', 'Open selected'],
  clearSelection: ['Չեղարկել', 'Сбросить', 'Clear'],
  datesClosedToast: ['Ամսաթվերը փակված են', 'Даты закрыты', 'Dates closed'],
  datesOpenedToast: ['Ամսաթվերը բացված են', 'Даты открыты', 'Dates opened'],
  noRequests: ['Հարցումներ դեռ չկան', 'Запросов пока нет', 'No requests yet'],
  declineW: ['Մերժել', 'Отклонить', 'Decline'],
  cancelBookingW: ['Չեղարկել', 'Отменить', 'Cancel'],
  openChatW: ['Չաթ', 'Чат', 'Chat'],
  bkPending: ['Սպասում է պատասխանի', 'Ожидает ответа', 'Awaiting reply'],
  bkConfirmed: ['Հաստատված է', 'Подтверждено', 'Confirmed'],
  bkDeclined: ['Մերժված է', 'Отклонено', 'Declined'],
  bkCancelled: ['Չեղարկված է', 'Отменено', 'Cancelled'],
  bookingRequestT: ['Ամրագրման հարցում', 'Запрос на бронирование', 'Booking request'],
  bkEvConfirmed: ['Հյուրանոցը հաստատեց ամրագրումը', 'Отель подтвердил бронирование', 'The hotel confirmed the booking'],
  bkEvDeclined: ['Հյուրանոցը մերժեց հարցումը', 'Отель отклонил запрос', 'The hotel declined the request'],
  bkEvCancelled: ['Հյուրը չեղարկեց հարցումը', 'Гость отменил запрос', 'The guest cancelled the request'],
  myBookings: ['Իմ ամրագրումները', 'Мои бронирования', 'My bookings'],
  onModeration: ['Մոդերացիայում է', 'На модерации', 'Under review'],
  kpiProperties: ['Օբյեկտներ', 'Объекты', 'Properties'],
  qtyN: ['{n} հատ', '{n} шт.', '{n} rooms'],
  kpiRequests: ['Նոր հարցումներ', 'Новые запросы', 'New requests'],
  kpiUpcoming: ['Հաստատված ամրագրումներ', 'Подтверждённые брони', 'Confirmed bookings'],
  noHotelsT: ['Օբյեկտներ դեռ չկան', 'Объектов пока нет', 'No properties yet'],
  noHotelsS: [
    'Ավելացրեք հյուրանոց, հոսթել կամ հյուրատուն՝ մոտ 3 րոպե',
    'Добавьте отель, хостел или гостевой дом — около 3 минут',
    'Add a hotel, hostel or guesthouse — about 3 minutes'
  ],
  prevMonth: ['Նախորդ ամիսը', 'Предыдущий месяц', 'Previous month'],
  nextMonth: ['Հաջորդ ամիսը', 'Следующий месяц', 'Next month'],
  bookingConfirmedToast: ['Ամրագրումը հաստատված է', 'Бронирование подтверждено', 'Booking confirmed'],
  bookingDeclinedToast: ['Հարցումը մերժված է', 'Запрос отклонён', 'Request declined'],
  bookingCancelledToast: ['Հարցումը չեղարկված է', 'Запрос отменён', 'Request cancelled'],
  errInvalidDates: ['Ստուգեք ամսաթվերը', 'Проверьте даты', 'Check the dates'],
  errInvalidGuests: ['Ստուգեք հյուրերի քանակը', 'Проверьте число гостей', 'Check the number of guests'],
  errNotAvailable: ['Այս ամսաթվերին ազատ համար չկա', 'На эти даты нет свободных номеров', 'No rooms available for these dates'],
  errOwnBooking: ['Չի կարելի ամրագրել սեփական օբյեկտը', 'Нельзя бронировать собственный объект', 'You can’t book your own property'],
  errBookingState: ['Հարցումն արդեն մշակված է', 'Запрос уже обработан', 'This request was already handled'],
  errRoomHasBookings: ['Այս համարն ունի ակտիվ ամրագրումներ', 'У номера есть активные бронирования', 'This room has active bookings'],
  errInvalidRoom: ['Լրացրեք համարի բոլոր դաշտերը', 'Заполните все поля номера', 'Fill in all room fields'],
  errHotelRequired: ['Նշեք անվանումը և հասցեն', 'Укажите название и адрес', 'Enter the name and address'],
  errStayKind: ['Ընտրեք օբյեկտի տեսակը', 'Выберите тип объекта', 'Choose the property type'],
  errStayTime: ['Ստուգեք մուտքի և ելքի ժամը', 'Проверьте время заезда и выезда', 'Check the check-in and check-out times'],
  errDealChange: ['Հայտարարության տեսակը հնարավոր չէ փոխել', 'Тип объявления нельзя изменить', 'The listing type can’t be changed'],
  errHotelRoleRequired: [
    'Հյուրանոցային օբյեկտ կարող են տեղադրել միայն «Հյուրանոց/հոստել» դերով հաշիվները։ Ուղարկեք հայտ դերի փոփոխության համար։',
    'Публиковать объекты размещения могут только аккаунты с ролью «Отель/хостел». Подайте заявку на смену роли в кабинете.',
    'Only accounts with the "Hotel/hostel" role can publish stays. Request a role change from your dashboard.'
  ],
  errHotelAccountDealRestricted: [
    'Ձեր հաշիվն ունի «Հյուրանոց/հոստել» տեսակ, ուստի կարող եք տեղադրել միայն հյուրանոցներ և հոստելներ։ Հաշվի տեսակը փոխելու համար դիմեք անձնական հաշվում։',
    'Ваш аккаунт имеет тип «Отель/хостел», поэтому вы можете размещать только отели и хостелы. Чтобы сменить тип аккаунта, подайте заявку на смену роли в личном кабинете.',
    'Your account type is "Hotel/hostel", so you can only list hotels and hostels. To change your account type, request a role change from your dashboard.'
  ],
  errRoleInvalid: ['Անթույլատրելի դեր', 'Недопустимая роль', 'Invalid role'],
  errRoleAlreadyHeld: ['Այս դերն արդեն ձեզ մոտ է', 'У вас уже есть эта роль', 'You already have this role'],
  errRoleRequestPending: [
    'Դուք արդեն ունեք հայտ ուսումնասիրման փուլում',
    'У вас уже есть заявка на рассмотрении',
    'You already have a pending request'
  ],
  errRoleRequestResolved: ['Հայտն արդեն մշակված է', 'Заявка уже обработана', 'This request has already been resolved'],
  roleRequestSentToast: [
    'Հայտն ուղարկված է։ Կապվենք ձեզ հետ ստուգումից հետո։',
    'Заявка отправлена. Мы свяжемся с вами после проверки.',
    'Request sent. We will follow up once it is reviewed.'
  ],
  roleUpgradeTitle: ['Ավելի շատ հնարավորություններ', 'Больше возможностей', 'More capabilities'],
  roleUpgradeText: [
    'Տեղադրել որպես գործակալություն կամ հյուրանոց/հոստել հնարավոր է աջակցության ստուգումից հետո։',
    'Публиковать как агентство или отель/хостел можно после проверки поддержкой.',
    'Posting as an agency or a hotel/hostel becomes available after support reviews your request.'
  ],
  roleRequestAgency: ['Հայտ․ Գործակալություն', 'Подать заявку: Агентство', 'Request: Agency'],
  roleRequestHotel: ['Հայտ․ Հյուրանոց/հոստել', 'Подать заявку: Отель/хостел', 'Request: Hotel/hostel'],
  roleRequestPendingAgency: [
    '«Գործակալություն» դերի հայտը ուսումնասիրման փուլում է',
    'Заявка на роль «Агентство» на рассмотрении',
    '"Agency" role request is under review'
  ],
  roleRequestPendingHotel: [
    '«Հյուրանոց/հոստել» դերի հայտը ուսումնասիրման փուլում է',
    'Заявка на роль «Отель/хостел» на рассмотрении',
    '"Hotel/hostel" role request is under review'
  ],
  roleRequestRejected: [
    'Հայտը մերժվել է։ Հարցերի դեպքում գրեք աջակցությանը։',
    'Заявка отклонена. Если это ошибка, напишите в поддержку.',
    'Request rejected. Contact support if this looks wrong.'
  ]
});

export const LANGS = ['ՀՅ', 'RU', 'EN'];
export const LI = { ՀՅ: 0, RU: 1, EN: 2 };
export { T };

export function tr(lang, key, vars) {
  const row = T[key];
  let out = row ? row[LI[lang] ?? 1] : key;
  if (vars) for (const k in vars) out = out.split('{' + k + '}').join(vars[k]);
  return out;
}

export function trN(lang, key, n, vars) {
  const forms = tr(lang, key, { n, ...vars }).split('|');
  if (forms.length === 3) {
    const a = n % 10,
      b = n % 100;
    return forms[a === 1 && b !== 11 ? 0 : a >= 2 && a <= 4 && (b < 12 || b > 14) ? 1 : 2];
  }
  return forms[forms.length === 2 && n !== 1 ? 1 : 0];
}

export function dict(lang) {
  const i = LI[lang] ?? 1,
    o = {};
  for (const k in T) o[k] = T[k][i];
  return o;
}
