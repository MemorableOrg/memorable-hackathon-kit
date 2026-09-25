// A fake restaurant-booking site: pages, links, forms. The agent only sees page text and can goto/fill/click.
export function makeSite() {
  const state = { url: 'https://tables.example/', query: '', party: '', time: '', confirmed: false };
  const pages = {
    '/': () => `Tables.example — find a table\n[input name=q] search restaurants\n[button#search] Search`,
    '/search': () => state.query.toLowerCase().includes('nopa')
      ? `Results for "${state.query}"\n[link#r-nopa] Nopa — Californian, SF\n[link#r-zuni] Zuni Cafe`
      : `Results for "${state.query}"\n[link#r-zuni] Zuni Cafe\n[link#r-lers] Lers Ros`,
    '/r/nopa': () => `Nopa\n[select#party] party size (1-8)\n[select#time] time (17:00,18:00,19:00,20:00)\n[button#find] Find a table`,
    '/r/zuni': () => `Zuni Cafe\n[select#party] party size\n[select#time] time\n[button#find] Find a table`,
    '/book': () => state.party && state.time
      ? `Nopa · party of ${state.party} at ${state.time}\n[button#confirm] Confirm reservation`
      : `Pick a party size and a time first.\n[link#back] Back`,
    '/confirmed': () => `Reservation confirmed: Nopa, party of ${state.party}, ${state.time}. Confirmation #A17.`,
  };
  const path = () => new URL(state.url).pathname;
  const api = {
    goto: ({ url }) => { state.url = url.startsWith('http') ? url : `https://tables.example${url}`; return page(); },
    fill: ({ selector, text }) => {
      if (selector.includes('q')) state.query = text;
      else if (selector.includes('party')) state.party = text;
      else if (selector.includes('time')) state.time = text;
      return page();
    },
    click: ({ selector }) => {
      const p = path();
      if (selector.includes('search')) state.url = 'https://tables.example/search';
      else if (selector.includes('r-nopa')) state.url = 'https://tables.example/r/nopa';
      else if (selector.includes('r-zuni')) state.url = 'https://tables.example/r/zuni';
      else if (selector.includes('find') && p.startsWith('/r/')) state.url = 'https://tables.example/book';
      else if (selector.includes('confirm') && p === '/book' && state.party && state.time) { state.confirmed = true; state.url = 'https://tables.example/confirmed'; }
      else if (selector.includes('back')) state.url = 'https://tables.example/r/nopa';
      return page();
    },
    done: ({ summary }) => ({ ok: state.confirmed, summary }),
  };
  function page() { return { url: state.url, text: (pages[path()] ?? (() => '404'))() }; }
  return { api, state };
}
