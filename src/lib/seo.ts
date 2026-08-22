export type PageRobots = "index,follow" | "noindex,nofollow";

export type PageMetadata = {
  title: string;
  description: string;
  canonicalPath: string;
  robots?: PageRobots;
  ogType?: "website" | "article";
  publishedAt?: string;
  modifiedAt?: string;
};

const managedAttribute = "data-eoringo-seo";

const upsertMeta = (attributes: Record<string, string>, content: string) => {
  const selector = Object.entries(attributes)
    .map(([key, value]) => `meta[${key}="${CSS.escape(value)}"]`)
    .join("");
  let element = document.head.querySelector<HTMLMetaElement>(selector);

  if (!element) {
    element = document.createElement("meta");
    Object.entries(attributes).forEach(([key, value]) => element?.setAttribute(key, value));
    element.setAttribute(managedAttribute, "true");
    document.head.appendChild(element);
  }

  element.setAttribute("content", content);
};

const upsertLink = (rel: string, href: string) => {
  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);

  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", rel);
    element.setAttribute(managedAttribute, "true");
    document.head.appendChild(element);
  }

  element.setAttribute("href", href);
};

export const setPageMetadata = ({
  title,
  description,
  canonicalPath,
  robots = "index,follow",
  ogType = "website",
  publishedAt,
  modifiedAt,
}: PageMetadata) => {
  const canonicalUrl = new URL(canonicalPath, window.location.origin).toString();

  document.head
    .querySelectorAll<HTMLScriptElement>(`script[${managedAttribute}="true"]`)
    .forEach((element) => element.remove());

  document.title = title;
  upsertMeta({ name: "description" }, description);
  upsertMeta({ name: "robots" }, robots);
  upsertMeta({ property: "og:title" }, title);
  upsertMeta({ property: "og:description" }, description);
  upsertMeta({ property: "og:type" }, ogType);
  upsertMeta({ property: "og:url" }, canonicalUrl);
  upsertMeta({ property: "og:site_name" }, "에오링고");
  upsertMeta({ property: "og:locale" }, "ko_KR");
  upsertLink("canonical", canonicalUrl);

  if (publishedAt) {
    upsertMeta({ property: "article:published_time" }, publishedAt);
  } else {
    document.head
      .querySelector<HTMLMetaElement>('meta[property="article:published_time"]')
      ?.remove();
  }

  if (modifiedAt) {
    upsertMeta({ property: "article:modified_time" }, modifiedAt);
  } else {
    document.head
      .querySelector<HTMLMetaElement>('meta[property="article:modified_time"]')
      ?.remove();
  }
};

export const setJsonLd = (id: string, value: Record<string, unknown>) => {
  let element = document.head.querySelector<HTMLScriptElement>(`script#${CSS.escape(id)}`);

  if (!element) {
    element = document.createElement("script");
    element.id = id;
    element.type = "application/ld+json";
    element.setAttribute(managedAttribute, "true");
    document.head.appendChild(element);
  }

  element.textContent = JSON.stringify(value);
};
