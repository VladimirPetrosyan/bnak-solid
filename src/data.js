const CITY = {
  yerevan: { n: ['Երևան', 'Ереван', 'Yerevan'], ll: [40.1792, 44.4991], z: 12 },
  gyumri: { n: ['Գյումրի', 'Гюмри', 'Gyumri'], ll: [40.7894, 43.8475], z: 13 },
  vanadzor: { n: ['Վանաձոր', 'Ванадзор', 'Vanadzor'], ll: [40.8128, 44.4883], z: 13 },
  dilijan: { n: ['Դիլիջան', 'Дилижан', 'Dilijan'], ll: [40.7409, 44.8618], z: 14 },
  tsaghkadzor: { n: ['Ծաղկաձոր', 'Цахкадзор', 'Tsaghkadzor'], ll: [40.532, 44.719], z: 14 },
  sevan: { n: ['Սևան', 'Севан', 'Sevan'], ll: [40.5486, 44.954], z: 13 }
};

const DIST = {
  kentron: ['Կենտրոն', 'Кентрон', 'Kentron'],
  arabkir: ['Արաբկիր', 'Арабкир', 'Arabkir'],
  kanaker: ['Քանաքեռ-Զեյթուն', 'Канакер-Зейтун', 'Kanaker-Zeytun'],
  shengavit: ['Շենգավիթ', 'Шенгавит', 'Shengavit'],
  malatia: ['Մալաթիա-Սեբաստիա', 'Малатия-Себастия', 'Malatia-Sebastia'],
  davtashen: ['Դավթաշեն', 'Давташен', 'Davtashen'],
  nornork: ['Նոր Նորք', 'Нор Норк', 'Nor Nork'],
  erebuni: ['Էրեբունի', 'Эребуни', 'Erebuni'],
  ajapnyak: ['Աջափնյակ', 'Аджапняк', 'Ajapnyak'],
  avan: ['Ավան', 'Аван', 'Avan'],
  center: ['Կենտրոն', 'Центр', 'Center']
};

const FEAT = {
  furn: ['Կահույք', 'Мебель', 'Furnished'],
  washer: ['Լվացքի մեքենա', 'Стиральная машина', 'Washer'],
  ac: ['Օդորակիչ', 'Кондиционер', 'Air conditioning'],
  balcony: ['Պատշգամբ', 'Балкон', 'Balcony'],
  parking: ['Ավտոկայանատեղի', 'Паркинг', 'Parking'],
  elev: ['Վերելակ', 'Лифт', 'Elevator'],
  kids: ['Երեխաներով', 'Можно с детьми', 'Kids welcome'],
  pets: ['Կենդանիներով', 'Можно с животными', 'Pets welcome'],
  wifi: ['Ինտերնետ', 'Интернет', 'Wi-Fi'],
  tv: ['Հեռուստացույց', 'Телевизор', 'TV']
};

export { CITY, DIST, FEAT };

export function nf(n) {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}
