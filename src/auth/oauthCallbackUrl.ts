export const stripOAuthCallbackQuery = (href: string) => {
  const url = new URL(href);
  url.search = "";

  return `${url.pathname}${url.hash}`;
};
