// Deterministic ids. Identity merges are conservative: the same name at a different
// company is a different person until the user resolves it.

export const slug = (s: string) =>
  s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export const personId = (name: string, company?: string) => `person:${slug(name)}@${company ? slug(company) : 'unaffiliated'}`;
export const companyId = (name: string) => `company:${slug(name)}`;
export const topicId = (name: string) => `topic:${slug(name)}`;
