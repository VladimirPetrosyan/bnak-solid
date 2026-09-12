import { LI } from './i18n';
import { OPERATOR_NAME, OPERATOR_EMAIL, OPERATOR_CITY } from './config';

export const LEGAL_IDS = ['privacy', 'terms', 'personalData', 'cookies', 'listingRules', 'tokenRules', 'complaints', 'contacts'];

export const LEGAL_CONSENT_IDS = ['terms', 'privacy', 'personalData'];

export const LEGAL_KEY_BY_ID = {
  privacy: 'legalPrivacy',
  terms: 'legalTerms',
  personalData: 'legalPersonalData',
  cookies: 'legalCookies',
  listingRules: 'legalListingRules',
  tokenRules: 'legalTokenRules',
  complaints: 'legalComplaints',
  contacts: 'legalContacts'
};

const PLACEHOLDER = ['կհրապարակվի հանրային մեկնարկից առաջ', 'будет указано до публичного запуска', 'to be published before public launch'];

const DOCS = {
  terms: {
    updated: '2026-08-25',
    summary: [
      'Ինչպես է աշխատում HayHome-ը և ինչ պատասխանատվություն ունի հարթակը',
      'Как устроен HayHome и за что отвечает площадка',
      'How HayHome works and what the platform is responsible for'
    ],
    sections: [
      {
        heading: ['Ծառայության մասին', 'О сервисе', 'About the service'],
        body: [
          [
            'HayHome-ը Հայաստանի անշարժ գույքի հայտարարությունների տեղեկատվական հարթակ է։ Հարթակը միջնորդ (գործակալ) չէ և օգտատերերի միջև գործարքի կողմ չէ. այն միայն թույլ է տալիս տեղադրել, գտնել և քննարկել հայտարարություններ։',
            'Ծառայությունը գտնվում է բետա փուլում. գործառույթները և այս փաստաթղթերը կարող են փոփոխվել մինչև հանրային մեկնարկը։'
          ],
          [
            'HayHome — информационная площадка объявлений о недвижимости в Армении. Площадка не является агентом и не выступает стороной сделки между пользователями — она только даёт возможность размещать, находить и обсуждать объявления.',
            'Сервис работает в режиме беты: функциональность и эти документы могут дорабатываться до публичного запуска.'
          ],
          [
            'HayHome is an information platform for real-estate listings in Armenia. The platform is not an agent and is not a party to any deal between users — it only lets people post, find and discuss listings.',
            'The service is in beta: features and these documents may still change before the public launch.'
          ]
        ]
      },
      {
        heading: ['Հաշիվ և գրանցում', 'Аккаунт и регистрация', 'Account and sign-up'],
        body: [
          [
            'Գրանցումը կատարվում է հեռախոսահամարով և SMS-կոդով։ Օգտատերը հաստատում է, որ նշված տվյալները ճշգրիտ են և ինքն իրավասու է տեղադրել համապատասխան հայտարարությունը։'
          ],
          [
            'Регистрация происходит по номеру телефона и SMS-коду. Пользователь подтверждает, что указанные данные достоверны и что он вправе размещать соответствующее объявление.'
          ],
          [
            'Sign-up happens by phone number and SMS code. The user confirms that the provided details are accurate and that they are entitled to post the corresponding listing.'
          ]
        ]
      },
      {
        heading: ['Հայտարարությունների տեղադրում', 'Размещение объявлений', 'Posting listings'],
        body: [
          [
            'Օգտատերը տեղադրում է նկարագրություն, լուսանկարներ, հեռախոսահամար և, անհրաժեշտության դեպքում, փաստաթղթեր՝ մոդերացիայի համար։ Տվյալների ճշգրտության համար պատասխանատվությունը կրում է հրապարակող օգտատերը։ Հարթակը կատարում է մոդերացիա մատչելի չափանիշներով, սակայն դա օբյեկտի իրավաբանական մաքրության երաշխիք չէ։'
          ],
          [
            'Пользователь размещает описание, фотографии, телефон и, при необходимости, документы для модерации. За достоверность указанных данных отвечает разместивший объявление пользователь. Площадка проводит модерацию по доступным ей критериям, но эта проверка не является гарантией юридической чистоты объекта.'
          ],
          [
            'The user posts a description, photos, a phone number and, where required, documents for moderation. The user who posts the listing is responsible for the accuracy of that information. The platform moderates listings using the criteria available to it, but this check is not a guarantee that the property is legally clear.'
          ]
        ]
      },
      {
        heading: ['Ակտուալության հաստատում', 'Подтверждение актуальности', 'Confirming that a listing is still current'],
        body: [
          [
            'Մոտավորապես 72 ժամը մեկ համակարգը սեփականատիրոջից խնդրում է հաստատել, որ հայտարարությունը դեռ ակտուալ է։ Սա տեխնիկական գործառույթ է՝ արդյունքները թարմ պահելու համար, և ոչ թե օբյեկտի փաստացի վիճակի կամ առկայության իրավաբանական կամ տեխնիկական երաշխիք։'
          ],
          [
            'Примерно раз в 72 часа система просит владельца подтвердить, что объявление всё ещё актуально. Это техническая функция для поддержания свежести выдачи, а не юридическая или техническая гарантия фактического наличия либо состояния объекта.'
          ],
          [
            'Roughly every 72 hours the system asks the owner to confirm the listing is still current. This is a technical mechanism for keeping search results fresh — it is not a legal or technical guarantee of the property’s actual availability or condition.'
          ]
        ]
      },
      {
        heading: ['Տոկեններ և VIP', 'Токены и VIP', 'Tokens and VIP'],
        body: [
          [
            'Ազնիվ վարքագծի համար օգտատերը կարող է ստանալ ներքին տոկեններ, որոնք ծախսվում են VIP-առաջխաղացման վրա։ Մանրամասները՝ առանձին կանոններում («Տոկենների և VIP կանոններ»)։'
          ],
          [
            'За добросовестное поведение пользователь может получать внутренние токены, которые тратятся на VIP-продвижение объявлений. Подробности — в отдельных правилах («Правила токенов и VIP»).'
          ],
          [
            'For good-faith behaviour a user may earn internal tokens that can be spent on VIP promotion of listings. Details are covered in a separate document (“Token and VIP rules”).'
          ]
        ]
      },
      {
        heading: ['Պատասխանատվության սահմանափակում', 'Ограничение ответственности', 'Limitation of liability'],
        body: [
          [
            'Հայաստանի Հանրապետության օրենսդրությամբ թույլատրված սահմաններում հարթակը չի կրում պատասխանատվություն հայտարարությունների բովանդակության, օգտատերերի գործողությունների և նրանց միջև գործարքների արդյունքի համար։ Այս պայմանագրում ոչինչ չի սահմանափակում իրավունքներ, որոնք օրենքով չեն կարող սահմանափակվել, այդ թվում՝ սպառողի պարտադիր իրավունքները։'
          ],
          [
            'В пределах, допускаемых законодательством Республики Армения, площадка не несёт ответственности за содержание объявлений, действия пользователей и результат сделок между ними. Ничто в этом соглашении не ограничивает права, которые не могут быть ограничены законом, включая обязательные права потребителей.'
          ],
          [
            'To the extent permitted by the law of the Republic of Armenia, the platform is not liable for the content of listings, users’ actions, or the outcome of deals between them. Nothing in this agreement limits rights that cannot be limited by law, including mandatory consumer rights.'
          ]
        ]
      },
      {
        heading: ['Փոփոխություններ և սահմանափակումներ', 'Изменения и ограничения доступа', 'Changes and access restrictions'],
        body: [
          [
            'Պայմանները կարող են փոփոխվել. էական փոփոխությունների մասին օգտատերերին կտեղեկացվի ինտերֆեյսում՝ նախքան դրանց ուժի մեջ մտնելը։ Կանոնները խախտելու դեպքում հարթակն իրավունք ունի սահմանափակել հաշվի հասանելիությունը կամ հանել հայտարարությունը հրապարակումից։'
          ],
          [
            'Условия могут меняться: о существенных изменениях пользователи будут заметно уведомлены в интерфейсе до вступления их в силу. При нарушении правил площадка вправе ограничить доступ к аккаунту или снять объявление с публикации.'
          ],
          [
            'These terms may change: users will be notified clearly in the interface of material changes before they take effect. If the rules are broken, the platform may restrict account access or take a listing down.'
          ]
        ]
      }
    ]
  },

  privacy: {
    updated: '2026-08-25',
    summary: [
      'Ինչպես ենք վերաբերվում տվյալներին բետա փուլում',
      'Как площадка обращается с данными на этапе беты',
      'How the platform handles data during beta'
    ],
    sections: [
      {
        heading: ['Փաստաթղթի մասին', 'О документе', 'About this document'],
        body: [
          [
            'Այս էջը նկարագրում է, թե ինչպես HayHome-ը վերաբերվում է օգտատերերի տվյալներին ընդհանուր առմամբ։ Անձնական տվյալների մշակման իրավական մանրամասները տես առանձին փաստաթղթում («Անձնական տվյալների մշակում»)։'
          ],
          [
            'Эта страница описывает, как HayHome в целом обращается с данными пользователей. Юридические детали обработки персональных данных — в отдельном документе («Обработка персональных данных»).'
          ],
          [
            'This page describes, in general terms, how HayHome handles user data. The legal detail of personal-data processing is covered in a separate document (“Personal data processing”).'
          ]
        ]
      },
      {
        heading: ['Ինչ տվյալներ ենք հավաքում', 'Какие данные мы обрабатываем', 'What data we process'],
        body: [
          [
            'Հեռախոսահամար, ընտրված դեր (վարձակալ / սեփականատեր / գործակալություն), հայտարարությունների և ընտրանու տվյալներ, նամակագրություններ, դիտումների և հաստատումների պատմություն, մոդերացիայի համար վերբեռնված փաստաթղթեր, ինչպես նաև սարքի/դիտարկիչի տեխնիկական տվյալները, որոնք անհրաժեշտ են ծառայության աշխատանքի համար։'
          ],
          [
            'Номер телефона, выбранная роль (арендатор / собственник / агентство), данные объявлений и избранного, переписки, история просмотров и подтверждений, документы, загруженные на модерацию, а также технические данные устройства и браузера, нужные для работы сервиса.'
          ],
          [
            'Phone number, chosen role (tenant / owner / agency), listing and favorites data, chat messages, viewing and confirmation history, documents uploaded for moderation, and the technical device/browser data needed to run the service.'
          ]
        ]
      },
      {
        heading: ['Ինչի համար ենք օգտագործում', 'Для чего мы это используем', 'What we use it for'],
        body: [
          [
            'Մուտք և հեռախոսահամարի հաստատում, հայտարարությունների ցուցադրում, չաթեր և իրական ժամանակի ծանուցումներ (WebSocket), մոդերացիա, ակտուալության հաստատումների և բողոքների մշակում, ինչպես նաև ընդհանուր վիճակագրություն ծառայությունը բարելավելու համար։'
          ],
          [
            'Вход и подтверждение телефона, показ объявлений, чаты и уведомления в реальном времени (WebSocket), модерация, обработка подтверждений актуальности и жалоб, а также общая статистика для улучшения сервиса.'
          ],
          [
            'Sign-in and phone verification, showing listings, chats and real-time notifications (WebSocket), moderation, processing relevance confirmations and complaints, and aggregate statistics used to improve the service.'
          ]
        ]
      },
      {
        heading: ['Ում ենք բացում տվյալները', 'Кому мы открываем данные', 'Who we share data with'],
        body: [
          [
            'Այլ օգտատերերի տվյալները հասանելի են միայն նպատակին համապատասխան չափով. օրինակ՝ հեռախոսահամարը ցուցադրվում է միայն այն օգտատիրոջը, ով հստակ սեղմել է «ցույց տալ հեռախոսը»։ Տվյալները չեն վաճառվում։ Դրանք կարող են փոխանցվել ծառայության աշխատանքի համար անհրաժեշտ մշակողների (hosting, SMS-ծառայություն) կամ օրենքով պահանջվող դեպքերում։'
          ],
          [
            'Данные других пользователей открываются только в объёме, нужном для конкретной цели: например, номер телефона показывается лишь тому, кто явно нажал «показать телефон». Данные не продаются. Они могут передаваться обработчикам, необходимым для работы сервиса (хостинг, SMS-провайдер), и в случаях, предусмотренных законом.'
          ],
          [
            'Other users’ data is shared only to the extent a specific purpose requires it — for example, a phone number is revealed only to the user who explicitly tapped “show phone”. Data is not sold. It may be passed to processors needed to run the service (hosting, SMS provider) and where required by law.'
          ]
        ]
      },
      {
        heading: ['Ձեր իրավունքները', 'Ваши права', 'Your rights'],
        body: [
          [
            'Դուք կարող եք հարցնել՝ ինչ տվյալներ ունենք ձեր մասին, պահանջել դրանց ուղղում կամ ջնջում։ Ինչպես դիմել՝ տես «Կոնտակտներ և օպերատորի տվյալներ» բաժինը։'
          ],
          [
            'Вы можете узнать, какие данные о вас у нас есть, попросить их исправить или удалить. Как обратиться — в разделе «Контакты и реквизиты оператора».'
          ],
          [
            'You can ask what data we hold about you and request that it be corrected or deleted. See “Contacts and operator details” for how to reach us.'
          ]
        ]
      },
      {
        heading: ['Բետա փուլ', 'Бета-статус', 'Beta status'],
        body: [
          [
            'Ծառայությունը ակտիվորեն զարգացվում է, ուստի որոշ գործառույթներ և ինտեգրումներ կարող են փոփոխվել։ Քաղաքականության էական փոփոխությունների մասին կհայտնվի ծանուցում ինտերֆեյսում։'
          ],
          [
            'Сервис активно дорабатывается, поэтому часть функций и интеграций может меняться. О существенных изменениях этой политики будет сообщено уведомлением в интерфейсе.'
          ],
          [
            'The service is under active development, so some features and integrations may change. Material changes to this policy will be announced with an in-app notice.'
          ]
        ]
      }
    ]
  },

  personalData: {
    updated: '2026-08-25',
    summary: [
      'Անձնական տվյալների մշակման հիմքերը, ժամկետները և ձեր իրավունքները',
      'Основания, сроки и права при обработке персональных данных',
      'Grounds, retention and your rights for personal data processing'
    ],
    sections: [
      {
        heading: ['Օպերատոր', 'Оператор обработки', 'Data controller'],
        body: [
          [
            'Օպերատորը՝ {name}։ Կոնտակտային էլ. հասցեն՝ {email}, գործունեության քաղաքը՝ {city}։',
            'Իրավաբանական անձի ամբողջական գրանցման տվյալները (գրանցման հասցեն և համարը) ' + PLACEHOLDER[0] + '։'
          ],
          [
            'Оператор — {name}. Контактный email: {email}, город деятельности: {city}.',
            'Полные регистрационные реквизиты юридического лица (юридический адрес и номер регистрации) ' + PLACEHOLDER[1] + '.'
          ],
          [
            'The operator is {name}. Contact email: {email}, city of operation: {city}.',
            'Full corporate registration details (registered address and registration number) are ' + PLACEHOLDER[2] + '.'
          ]
        ]
      },
      {
        heading: ['Տվյալների կատեգորիաներ', 'Категории данных', 'Categories of data'],
        body: [
          [
            'Նույնականացման տվյալներ (հեռախոսահամար, անուն, դեր), հայտարարությունների և գործարքի հետ կապված տվյալներ, նամակագրություններ, մոդերացիայի փաստաթղթեր (այդ թվում՝ նույնականացնող փաստաթղթեր, եթե դրանք վերբեռնվել են), ինչպես նաև սարքի/դիտարկիչի տեխնիկական տվյալներ։'
          ],
          [
            'Идентификационные данные (телефон, имя, роль), данные объявлений и связанные с ними, переписки, документы для модерации (в т.ч. документы, удостоверяющие право на объект, если они были загружены), а также технические данные устройства и браузера.'
          ],
          [
            'Identifying data (phone, name, role), listing-related data, chat messages, documents submitted for moderation (including ownership documents where uploaded), and technical device/browser data.'
          ]
        ]
      },
      {
        heading: ['Մշակման հիմքեր և նպատակներ', 'Основания и цели обработки', 'Legal basis and purposes'],
        body: [
          [
            'Օգտատիրոջ հետ պայմանագրի կատարում (հաշիվ, հայտարարություններ, չաթ, ընտրանի, ակտուալության հաստատում, բողոքներ), ինչպես նաև հարթակի իրավաչափ շահը՝ ապահովություն և կեղծիքից պաշտպանություն ապահովելու համար։ Այնտեղ, որտեղ մշակումը հիմնված է համաձայնության վրա, այն կարող է հետ կանչվել։'
          ],
          [
            'Исполнение соглашения с пользователем (аккаунт, объявления, чат, избранное, подтверждение актуальности, жалобы), а также законный интерес площадки — обеспечение безопасности и защита от мошенничества. Там, где обработка основана на согласии, его можно отозвать.'
          ],
          [
            'Performance of the agreement with the user (account, listings, chat, favorites, relevance confirmation, complaints), and the platform’s legitimate interest in security and fraud prevention. Where processing relies on consent, that consent can be withdrawn.'
          ]
        ]
      },
      {
        heading: ['Հաստատող փաստաթղթեր', 'Документы верификации', 'Verification documents'],
        body: [
          [
            'Հրապարակումից առաջ վերբեռնված փաստաթղթերն օգտագործվում են բացառապես ստուգման և մոդերացիայի համար, հասանելի են միայն մոդերատորներին և չեն հրապարակվում հայտարարությունում։'
          ],
          [
            'Документы, загруженные перед публикацией, используются исключительно для проверки и модерации, доступны только модераторам и не публикуются в самом объявлении.'
          ],
          [
            'Documents uploaded before publication are used solely for review and moderation, are accessible only to moderators, and are never published within the listing itself.'
          ]
        ]
      },
      {
        heading: ['Պահպանման ժամկետներ', 'Сроки хранения', 'Retention'],
        body: [
          [
            'Տվյալները պահվում են այնքան ժամանակ, քանի դեռ հաշիվը ակտիվ է, կամ քանի դեռ դա անհրաժեշտ է մշակման նպատակի կամ օրենքի պահանջի համար։ Կատեգորիաների ճշգրիտ պահպանման ժամկետները (օրինակ՝ մոդերացիայի փաստաթղթեր, ջնջված հայտարարությունների արխիվ) ' +
              PLACEHOLDER[0] +
              '. մինչ այդ գործում է վերոնշյալ ընդհանուր սկզբունքը։'
          ],
          [
            'Данные хранятся, пока аккаунт активен, либо пока это необходимо для цели обработки или требования закона. Точные сроки хранения по категориям (например, документы модерации, архив удалённых объявлений) ' +
              PLACEHOLDER[1] +
              '; до тех пор действует указанный выше общий принцип.'
          ],
          [
            'Data is kept for as long as the account is active, or for as long as needed for the processing purpose or a legal requirement. Exact retention periods per category (e.g. moderation documents, archived deleted listings) are ' +
              PLACEHOLDER[2] +
              '; the general principle above applies until then.'
          ]
        ]
      },
      {
        heading: ['Ձեր իրավունքները', 'Права субъекта данных', 'Data subject rights'],
        body: [
          [
            'Հասանելիություն ձեր տվյալներին, դրանց ուղղում, ջնջման հայցում, ինչպես նաև համաձայնության հետկանչում այնտեղ, որտեղ մշակումը հիմնված է դրա վրա։ Դիմելու եղանակը՝ «Կոնտակտներ և օպերատորի տվյալներ» բաժնում։'
          ],
          [
            'Доступ к своим данным, их исправление, запрос удаления, а также отзыв согласия там, где обработка основана на нём. Как обратиться — в разделе «Контакты и реквизиты оператора».'
          ],
          [
            'Access to your data, correction, a deletion request, and withdrawal of consent where processing relies on it. See “Contacts and operator details” for how to reach us.'
          ]
        ]
      },
      {
        heading: ['Անչափահասներ', 'Несовершеннолетние', 'Minors'],
        body: [
          [
            'Ծառայությունը նախատեսված չէ այն անձանց համար, ովքեր ՀՀ օրենսդրությամբ սահմանված տարիքի չեն հասել՝ ինքնուրույն նման պայմանագրեր կնքելու համար։'
          ],
          [
            'Сервис не предназначен для лиц, не достигших возраста, установленного законодательством Республики Армения для самостоятельного заключения подобных соглашений.'
          ],
          [
            'The service is not intended for people who have not reached the age required under the law of the Republic of Armenia to enter into such agreements on their own.'
          ]
        ]
      }
    ]
  },

  cookies: {
    updated: '2026-08-25',
    summary: [
      'Ինչ ենք օգտագործում այժմ և ինչ կարող ենք ավելացնել հետագայում',
      'Что используется сейчас и что может появиться позже',
      'What is in use now and what may be added later'
    ],
    sections: [
      {
        heading: ['Անհրաժեշտ տեխնոլոգիաներ (այժմ ակտիվ)', 'Необходимые технологии (сейчас активны)', 'Necessary technologies (active now)'],
        body: [
          [
            'HayHome-ն օգտագործում է միայն սեսիայի, մուտքի, ընտրված լեզվի և ինտերֆեյսի կարգավորումների պահպանման տեխնիկապես անհրաժեշտ մեխանիզմներ (localStorage և նմանատիպ)։ Առանց դրանց կայքը չի աշխատում ճիշտ։'
          ],
          [
            'HayHome использует только технически необходимые механизмы хранения сессии, входа, выбранного языка и настроек интерфейса (localStorage и аналогичные технологии). Без них сайт не может работать корректно.'
          ],
          [
            'HayHome uses only technically necessary mechanisms to store the session, sign-in state, chosen language and interface settings (localStorage and similar technologies). The site cannot work correctly without them.'
          ]
        ]
      },
      {
        heading: ['Անալիտիկա (այժմ ոչ ակտիվ)', 'Аналитика (сейчас не активна)', 'Analytics (not active now)'],
        body: [
          [
            'Ապագայում հարթակը կարող է միացնել ոչ պարտադիր անալիտիկ cookie-ներ՝ ծառայությունը բարելավելու համար։ Ներկա պահին դրանք չեն օգտագործվում և ակտիվ չեն։ Այս բաժինը կթարմացվի մինչև դրանց հնարավոր միացումը՝ ընտրության հնարավորությամբ։'
          ],
          [
            'В будущем площадка может подключить необязательные аналитические cookie для улучшения сервиса. На данный момент они не используются и не активны. Этот раздел будет обновлён до их возможного включения, вместе с возможностью выбора.'
          ],
          [
            'In the future the platform may add optional analytics cookies to improve the service. At present they are not used and are not active. This section will be updated before they are enabled, together with an opt-in choice.'
          ]
        ]
      },
      {
        heading: ['Կառավարում', 'Управление', 'Control'],
        body: [
          [
            'Անհրաժեշտ մեխանիզմները հնարավոր չէ անջատել՝ առանց կայքի աշխատունակությունը կորցնելու։ Երբ հայտնվի ոչ պարտադիր անալիտիկա, ավելացվելու է առանձին ընտրություն/համաձայնություն։'
          ],
          [
            'Необходимые механизмы нельзя отключить без потери работоспособности сайта. Когда появится необязательная аналитика, будет добавлен отдельный выбор или запрос согласия.'
          ],
          [
            'The necessary mechanisms cannot be turned off without breaking the site. When optional analytics is added, a separate choice or consent prompt will come with it.'
          ]
        ]
      },
      {
        heading: ['Երրորդ կողմի ծառայություններ', 'Сторонние сервисы', 'Third-party services'],
        body: [
          [
            'Քարտեզի բաժինն օգտագործում է Yandex Maps JS API. Այս երրորդ կողմի սկրիպտը կարող է սահմանել իր սեփական տեխնիկական cookie-ները՝ Yandex-ի քաղաքականությանը համապատասխան։'
          ],
          [
            'Раздел карты использует Yandex Maps JS API. Этот сторонний скрипт может устанавливать собственные технические cookie согласно политике Yandex.'
          ],
          [
            'The map section uses the Yandex Maps JS API. This third-party script may set its own technical cookies under Yandex’s own policy.'
          ]
        ]
      }
    ]
  },

  listingRules: {
    updated: '2026-08-25',
    summary: [
      'Ինչ կարելի է հրապարակել, ինչպես է աշխատում մոդերացիան և ինչ իրավունքներ եք տալիս HayHome-ին',
      'Что можно публиковать, как устроена модерация и какие права вы даёте HayHome',
      'What can be posted, how moderation works and what rights you grant HayHome'
    ],
    sections: [
      {
        heading: ['Ինչ կարելի է հրապարակել', 'Что можно публиковать', 'What can be posted'],
        body: [
          ['Հայաստանում գտնվող անշարժ գույքի հայտարարություններ՝ ճշգրիտ նկարագրությամբ, փաստացի պատկանող լուսանկարներով և արդիական գնով։'],
          [
            'Объявления о недвижимости, находящейся в Армении, с достоверным описанием, реально принадлежащими объекту фотографиями и актуальной ценой.'
          ],
          [
            'Listings for real estate located in Armenia, with an accurate description, photos that genuinely belong to the property, and a current price.'
          ]
        ]
      },
      {
        heading: ['Ինչ արգելվում է', 'Что запрещено', 'What is not allowed'],
        body: [
          [
            'Միտումնավոր կեղծ տվյալներ, ուրիշի լուսանկարներ, կրկնվող հայտարարություններ նույն օբյեկտի համար, ինչպես նաև անշարժ գույքին չառնչվող առարկաներ/ծառայություններ։'
          ],
          [
            'Заведомо ложные данные, чужие фотографии, дублирующиеся объявления одного и того же объекта, а также объекты и услуги, не относящиеся к недвижимости.'
          ],
          [
            'Knowingly false information, photos that belong to someone else, duplicate listings for the same property, and items or services unrelated to real estate.'
          ]
        ]
      },
      {
        heading: ['Հեռախոսահամար և փաստաթղթեր', 'Телефон и документы', 'Phone number and documents'],
        body: [
          [
            'Հեռախոսահամարը հրապարակային չի ցուցադրվում ինքնաբերաբար՝ այն բացվում է միայն հետաքրքրված օգտատիրոջ հստակ հարցումով։ Փաստաթղթերը հավաքվում են ստուգման նպատակով և հասանելի են միայն մոդերացիային։'
          ],
          [
            'Телефон не показывается публично автоматически — он открывается только по явному запросу заинтересованного пользователя. Документы запрашиваются для проверки и доступны только модерации.'
          ],
          [
            'The phone number is not shown publicly by default — it is revealed only on the explicit request of an interested user. Documents are collected for verification and are accessible only to moderation.'
          ]
        ]
      },
      {
        heading: ['Մոդերացիա', 'Модерация', 'Moderation'],
        body: [
          [
            'Հայտարարությունները և կցված փաստաթղթերը ստուգվում են մատչելի չափանիշներով։ Ստուգումը նվազեցնում, բայց չի բացառում սխալների կամ անազնիվ հայտարարությունների ռիսկը. հարթակը չի երաշխավորում յուրաքանչյուր հայտարարության բացարձակ ճշգրտությունը։'
          ],
          [
            'Объявления и приложенные документы проверяются по доступным критериям. Проверка снижает, но не исключает риск ошибок или недобросовестных объявлений — площадка не гарантирует абсолютную точность каждого объявления.'
          ],
          [
            'Listings and attached documents are reviewed against the criteria available to the platform. This review reduces but does not eliminate the risk of errors or bad-faith listings — the platform does not guarantee that every listing is entirely accurate.'
          ]
        ]
      },
      {
        heading: ['Ակտուալության հաստատում', 'Подтверждение актуальности', 'Confirming relevance'],
        body: [
          [
            'Մոտավորապես 72 ժամը մեկ սեփականատերը պետք է հաստատի, որ հայտարարությունը դեռ ուժի մեջ է, հակառակ դեպքում կարգավիճակը փոխվում է («չկա պատասխան» / արխիվ)։ Սա տեխնիկական գործիք է թարմ ցուցակի համար, ոչ թե օբյեկտի փաստացի առկայության իրավական երաշխիք։'
          ],
          [
            'Примерно раз в 72 часа владелец должен подтвердить, что объявление ещё в силе, иначе статус меняется («нет ответа» / архив). Это техническое средство поддержания свежести выдачи, а не юридическая гарантия фактического наличия объекта.'
          ],
          [
            'Roughly every 72 hours the owner must confirm the listing is still valid, otherwise its status changes (“no response” / archived). This is a technical tool for keeping listings fresh, not a legal guarantee that the property is actually still available.'
          ]
        ]
      },
      {
        heading: ['«Արդեն վարձակալված/վաճառված» բողոք', '«Уже сдано/продано»', '“Already taken/sold” complaints'],
        body: [
          [
            'Այս բողոքը անմիջապես նվազեցնում է հայտարարության տեսանելիությունը՝ մինչև ստուգումը։ Մանրամասները՝ «Բողոքներ և անվտանգություն» բաժնում։'
          ],
          ['Такая жалоба сразу снижает видимость объявления в выдаче до проверки. Подробности — в разделе «Жалобы и безопасность».'],
          [
            'This kind of complaint immediately lowers the listing’s visibility until it is reviewed. See “Complaints and safety” for details.'
          ]
        ]
      },
      {
        heading: ['Բովանդակության լիցենզիա', 'Лицензия на контент', 'Content licence'],
        body: [
          [
            'Հրապարակելով լուսանկարներ, տեքստ և տեսանյութ՝ օգտատերը հարթակին տալիս է միայն այն ցուցադրելու և մոդերացնելու համար անհրաժեշտ իրավունք։ Սա սեփականության իրավունքի փոխանցում չէ. հեղինակային իրավունքները մնում են օգտատիրոջը, ով կարող է ցանկացած պահի ջնջել հայտարարությունը։'
          ],
          [
            'Публикуя фото, текст и видео, пользователь предоставляет площадке только то право, которое необходимо для их показа и модерации в интерфейсе. Это не передача права собственности на контент — правообладателем остаётся пользователь, который может в любой момент удалить объявление.'
          ],
          [
            'By posting photos, text and video, the user grants the platform only the rights necessary to display and moderate that content in the interface. This is not a transfer of ownership of the content — the user remains the rights holder and can delete the listing at any time.'
          ]
        ]
      },
      {
        heading: ['Քարտեզի և կուրսերի ճշգրտություն', 'Точность карты и курсов обмена', 'Accuracy of the map and exchange rates'],
        body: [
          [
            'Քարտեզի վրա նշված գտնվելու վայրը և ցուցադրվող փոխարժեքները տեղեկատվական ուղենիշներ են և կարող են դիտման պահին չհամընկնել պաշտոնական աղբյուրների հետ։'
          ],
          [
            'Расположение на карте и отображаемые курсы обмена — справочные ориентиры и на момент просмотра могут не совпадать с официальными источниками.'
          ],
          [
            'The location shown on the map and the displayed exchange rates are reference points only and may not match official sources at the moment you view them.'
          ]
        ]
      }
    ]
  },

  tokenRules: {
    updated: '2026-08-25',
    summary: [
      'Ինչ են տոկենները, ինչու չեն դրանք փող, և ինչպես է աշխատում VIP-ը',
      'Что такое токены, почему это не деньги и как работает VIP',
      'What tokens are, why they are not money, and how VIP works'
    ],
    sections: [
      {
        heading: ['Ինչ են տոկենները', 'Что такое токены', 'What tokens are'],
        body: [
          [
            'Տոկենները հարթակի ներքին միավորներ են, որոնք հաշվեգրվում են ազնիվ վարքագծի համար. օրինակ՝ ակտուալության ժամանակին հաստատումներ, բողոքների բացակայություն, հայտարարության լիարժեքություն և հաստատված օգտակար բողոքներ։'
          ],
          [
            'Токены — это внутренние баллы платформы, которые начисляются за добросовестное поведение: например, своевременные подтверждения актуальности, отсутствие жалоб, полнота объявления и подтверждённые полезные жалобы.'
          ],
          [
            'Tokens are the platform’s internal points, awarded for good-faith behaviour: for example, timely relevance confirmations, an absence of complaints, a complete listing, and confirmed useful complaints.'
          ]
        ]
      },
      {
        heading: ['Տոկենները փող չեն', 'Токены — не деньги', 'Tokens are not money'],
        body: [
          [
            'Տոկենները դրամական արժեք չունեն։ Դրանք հնարավոր չէ գնել, վաճառել, փոխանակել դրամի կամ այլ ակտիվների հետ, կամ դուրս բերել համակարգից։'
          ],
          [
            'Токены не имеют денежной стоимости. Их нельзя купить, продать, обменять на деньги или другие активы, а также вывести из системы.'
          ],
          ['Tokens have no monetary value. They cannot be bought, sold, exchanged for money or other assets, or withdrawn from the system.']
        ]
      },
      {
        heading: ['VIP-առաջխաղացում', 'VIP-продвижение', 'VIP promotion'],
        body: [
          [
            'Հավաքված տոկենները կարելի է ծախսել՝ հայտարարությունը որոշակի ժամկետով որոնման արդյունքներում բարձրացնելու համար։ Ներկայումս սա տոկենների միակ կիրառումն է հարթակում։'
          ],
          [
            'Накопленные токены можно потратить на временное поднятие объявления в результатах поиска на определённый срок. Сейчас это единственный способ использования токенов на платформе.'
          ],
          [
            'Accumulated tokens can be spent to temporarily boost a listing in search results for a set period. This is currently the only way tokens can be used on the platform.'
          ]
        ]
      },
      {
        heading: ['Կանոնների փոփոխություն', 'Изменение правил', 'Changes to the rules'],
        body: [
          [
            'Հաշվեգրման պայմանները, VIP-ի արժեքը և տևողությունը կարող են փոփոխվել։ Էական փոփոխությունների մասին կհայտնվի ծանուցում ինտերֆեյսում՝ նախքան ուժի մեջ մտնելը։'
          ],
          [
            'Условия начисления, стоимость и длительность VIP могут меняться. О существенных изменениях будет заранее сообщено в интерфейсе — до их вступления в силу.'
          ],
          [
            'The rules for earning tokens, and the cost and duration of VIP, may change. Material changes will be announced in the interface in advance, before they take effect.'
          ]
        ]
      },
      {
        heading: ['Արդեն ակտիվացված VIP', 'Уже активированный VIP', 'VIP already activated'],
        body: [
          ['Կանոնների փոփոխությունը չեղարկում կամ չի կրճատում փոփոխության պահին արդեն ակտիվացված VIP-առաջխաղացումը։'],
          ['Изменение правил не отменяет и не сокращает VIP-продвижение, уже активированное на момент изменения.'],
          ['A change in the rules does not cancel or shorten VIP promotion that was already active at the time of the change.']
        ]
      },
      {
        heading: ['Չարաշահումների սահմանափակում', 'Ограничение при злоупотреблениях', 'Restrictions in case of abuse'],
        body: [
          [
            'Հարթակն իրավունք ունի չհաշվեգրել կամ չեղարկել տոկեններ, որոնք ստացվել են համակարգի շահարկման, խաբեության կամ հայտարարությունների կանոնների խախտման արդյունքում։'
          ],
          [
            'Площадка вправе не начислять или аннулировать токены, полученные в результате накрутки, обмана системы или нарушения правил объявлений.'
          ],
          ['The platform may withhold or cancel tokens obtained through gaming the system, deception, or violations of the listing rules.']
        ]
      }
    ]
  },

  complaints: {
    updated: '2026-08-25',
    summary: [
      'Ինչպես բողոքել, ինչ է կատարվում հետո և ինչին ուշադրություն դարձնել գործարքից առաջ',
      'Как пожаловаться, что происходит дальше и на что обратить внимание перед сделкой',
      'How to complain, what happens next, and what to watch for before a deal'
    ],
    sections: [
      {
        heading: ['Ինչպես բողոքել', 'Как пожаловаться', 'How to file a complaint'],
        body: [
          [
            'Յուրաքանչյուր հայտարարության վրա կա «Բողոքել» կոճակ, որտեղ ընտրվում է պատճառը՝ «արդեն վարձակալված/վաճառված», ոչ ճշգրիտ տվյալներ, խարդախության կասկած և այլն։'
          ],
          [
            'На карточке каждого объявления есть кнопка «Пожаловаться» с выбором причины: «уже сдано/продано», недостоверные данные, подозрение на мошенничество и т.д.'
          ],
          [
            'Every listing card has a “Report” button with a reason to pick: “already taken/sold”, inaccurate information, suspected fraud, and so on.'
          ]
        ]
      },
      {
        heading: ['Ինչ է կատարվում հետո', 'Что происходит после жалобы', 'What happens after a report'],
        body: [
          [
            '«Արդեն վարձակալված/վաճառված» նշված հայտարարությունը անմիջապես նվազեցնում է իր տեսանելիությունը որոնման արդյունքներում, մինչև ստուգումը։ Մասն բողոքների ուսումնասիրվում է մոդերացիայի կողմից։'
          ],
          [
            'Объявление, помеченное как «уже сдано/продано», сразу снижает видимость в выдаче до проверки. Часть жалоб дополнительно рассматривается модерацией.'
          ],
          [
            'A listing flagged as “already taken/sold” immediately loses visibility in search results until it is checked. Some complaints are additionally reviewed by moderation.'
          ]
        ]
      },
      {
        heading: ['Օգտակար բողոքներ', 'Полезные жалобы', 'Useful complaints'],
        body: [
          ['Հիմնավոր և ստուգմամբ հաստատված բողոքները կարող են հաշվի առնվել բողոք ներկայացնողի տոկենների հաշվարկում։'],
          ['Обоснованные жалобы, подтверждённые проверкой, могут учитываться в системе токенов автора жалобы.'],
          ['Well-founded complaints confirmed by review may be reflected in the reporting user’s token balance.']
        ]
      },
      {
        heading: ['Անվտանգություն գործարքի ժամանակ', 'Безопасность сделки', 'Safety during a deal'],
        body: [
          [
            'HayHome-ը գործարքի կողմ չէ և չի մասնակցում օգտատերերի միջև բանակցություններին, վճարմանը կամ փաստաթղթերի ստորագրմանը։ Ինքնուրույն ստուգեք հակառակ կողմի փաստաթղթերն ու ինքնությունը, զգույշ եղեք օբյեկտի զննումից առաջ կանխավճար կատարելիս։'
          ],
          [
            'HayHome не является стороной сделки и не участвует в переговорах, оплате или подписании документов между пользователями. Проверяйте документы и личность контрагента самостоятельно, будьте осторожны с предоплатой до осмотра объекта.'
          ],
          [
            'HayHome is not a party to the deal and does not take part in negotiations, payment, or the signing of documents between users. Verify the other party’s documents and identity yourself, and be cautious about paying in advance before viewing the property.'
          ]
        ]
      },
      {
        heading: ['Խարդախության մասին հաղորդում', 'Мошенничество и подозрительные объявления', 'Fraud and suspicious listings'],
        body: [
          [
            'Հայտնեք դրանց մասին «Բողոքել» կոճակով։ Անհրաժեշտության դեպքում հարթակն իրավունք ունի սահմանափակել հայտարարությունը կամ հաշիվը՝ մինչև հանգամանքների պարզաբանումը։'
          ],
          [
            'Сообщайте о них через кнопку «Пожаловаться». При необходимости площадка вправе ограничить объявление или аккаунт до выяснения обстоятельств.'
          ],
          [
            'Report these using the “Report” button. Where necessary the platform may restrict the listing or account until the circumstances are clarified.'
          ]
        ]
      },
      {
        heading: ['Եթե բողոքի կոճակը չի համապատասխանում', 'Если кнопка жалобы не подходит', 'If the report button does not fit'],
        body: [
          [
            'Հարցերի կամ բողոքների համար, որոնք դուրս են հայտարարության «Բողոքել» կոճակի շրջանակից, տես «Կոնտակտներ և օպերատորի տվյալներ» բաժինը։'
          ],
          [
            'По вопросам и жалобам, которые не покрываются кнопкой «Пожаловаться» на объявлении, — раздел «Контакты и реквизиты оператора».'
          ],
          ['For questions or complaints not covered by the listing’s “Report” button, see “Contacts and operator details”.']
        ]
      }
    ]
  },

  contacts: {
    updated: '2026-08-25',
    summary: [
      'Ինչպես կապվել, ինչպես հայցել հաշվի/տվյալների ջնջում',
      'Как связаться и как запросить удаление аккаунта или данных',
      'How to get in touch and request account or data deletion'
    ],
    sections: [
      {
        heading: ['Հարթակի օպերատոր', 'Оператор платформы', 'Platform operator'],
        body: [
          [
            'Օպերատորը՝ {name}, {city}։ Կոնտակտային էլ. հասցեն՝ {email}։',
            'Իրավաբանական անձի ամբողջական գրանցման տվյալները (անվանումը և հասցեն) ' + PLACEHOLDER[0] + '։'
          ],
          [
            'Оператор — {name}, {city}. Контактный email: {email}.',
            'Полное наименование и юридический адрес юридического лица ' + PLACEHOLDER[1] + '.'
          ],
          [
            'The operator is {name}, {city}. Contact email: {email}.',
            'The legal entity’s full name and registered address are ' + PLACEHOLDER[2] + '.'
          ]
        ]
      },
      {
        heading: ['Ինչ արդեն աշխատում է հավելվածում', 'Что уже работает в приложении', 'What already works in the app'],
        body: [
          [
            'Հայտարարության վրա բողոք ներկայացնելու համար՝ «Բողոքել» կոճակը հայտարարության էջում։ Սեփականատերերի հետ շփման համար՝ «Հաղորդագրություններ» բաժինը։'
          ],
          ['Для жалобы на объявление — кнопка «Пожаловаться» на странице объявления. Для общения с владельцами — раздел «Сообщения».'],
          ['To report a listing, use the “Report” button on the listing page. To message owners, use the “Messages” section.']
        ]
      },
      {
        heading: ['Հաշվի կամ տվյալների ջնջման հայցում', 'Запрос на удаление аккаунта или данных', 'Requesting account or data deletion'],
        body: [
          [
            'Հայցում ուղարկելիս նշեք հաշվի հեռախոսահամարը և հստակեցրեք հայցվող գործողությունը (հաշվի ամբողջական ջնջում, թե միայն որոշակի տվյալների)։ Այս հայցերի ընդունման կոնտակտային էլ. հասցեն՝ {email}, այն ցուցադրված է նաև անձնական էջում («Պրոֆիլ»)։'
          ],
          [
            'В запросе укажите номер телефона аккаунта и уточните, что именно нужно удалить — весь аккаунт или отдельные данные. Контактный канал для приёма таких запросов — email {email}, он также показан в разделе «Профиль».'
          ],
          [
            'In your request, state the account’s phone number and specify what should be deleted — the whole account or specific data. The contact channel for these requests is {email}, also shown in the “Profile” section.'
          ]
        ]
      },
      {
        heading: ['Պատասխանի ժամկետ', 'Срок ответа', 'Response time'],
        body: [
          [
            'Հարթակը ձգտում է պատասխանել ողջամիտ ժամկետում՝ հաշվի առնելով հայցի բնույթը և ՀՀ օրենսդրության պահանջները։ Հայցերի տեսակների ըստ ճշգրիտ ժամկետները ' +
              PLACEHOLDER[0] +
              '։'
          ],
          [
            'Площадка стремится ответить в разумный срок с учётом характера обращения и требований законодательства Республики Армения. Точные сроки по типам обращений ' +
              PLACEHOLDER[1] +
              '.'
          ],
          [
            'The platform aims to respond within a reasonable time, taking into account the nature of the request and the requirements of the law of the Republic of Armenia. Exact timeframes by request type are ' +
              PLACEHOLDER[2] +
              '.'
          ]
        ]
      },
      {
        heading: ['Օպերատորը գործարքի կողմ չէ', 'Оператор не является стороной сделки', 'The operator is not a party to your deal'],
        body: [
          [
            'Օբյեկտի վիճակի, վճարման կամ փաստաթղթերի հետ կապված հարցերով դիմեք ուղղակիորեն մյուս օգտատիրոջը։ Հարթակը կարող է աջակցել, բայց չի ներկայացնում որևէ կողմի շահեր։'
          ],
          [
            'По вопросам самой сделки — состояния объекта, оплаты, документов — обращайтесь напрямую к другому пользователю. Площадка может содействовать, но не представляет интересы ни одной из сторон.'
          ],
          [
            'For questions about the deal itself — the property’s condition, payment, documents — contact the other user directly. The platform may assist, but does not represent either party’s interests.'
          ]
        ]
      }
    ]
  }
};

// Версия пакета согласия при регистрации — самая свежая из дат обновления трёх
// документов, на которые ссылается чекбокс согласия (terms/privacy/personalData).
// Бэкенд хранит и сверяет её независимо (см. currentLegalVersion в backend/auth.go) —
// при правке текста любого из этих документов обновите обе константы вместе.
export const LEGAL_CONSENT_VERSION = LEGAL_CONSENT_IDS.map((id) => DOCS[id].updated).sort().pop();

export function resolveLegalId(id) {
  return LEGAL_IDS.includes(id) ? id : null;
}

function fillVars(text, vars) {
  let out = text;
  for (const k in vars) out = out.split('{' + k + '}').join(vars[k]);
  return out;
}

export function legalDoc(lang, id) {
  const rid = resolveLegalId(id);
  if (!rid) return null;
  const doc = DOCS[rid];
  const i = LI[lang] ?? 1;
  const vars = { name: OPERATOR_NAME, email: OPERATOR_EMAIL, city: OPERATOR_CITY };
  return {
    id: rid,
    updated: doc.updated,
    summary: doc.summary[i],
    sections: doc.sections.map((s) => ({ heading: s.heading[i], body: s.body[i].map((p) => fillVars(p, vars)) }))
  };
}

export function legalList(lang) {
  const i = LI[lang] ?? 1;
  return LEGAL_IDS.map((id) => ({ id, summary: DOCS[id].summary[i], updated: DOCS[id].updated }));
}
