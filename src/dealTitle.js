const DEAL_TITLE_KEY = {
  rent: 'titleRent',
  daily: 'titleDaily',
  sale: 'titleSale',
  newb: 'titleNew',
  comm: 'titleComm',
  hotel: 'titleHotel',
  all: 'titleAll'
};

export const dealTitleKey = (deal) => DEAL_TITLE_KEY[deal] || 'titleRent';
