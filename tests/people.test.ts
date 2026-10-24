import { pickLinkedIn } from '../src/domain/people';

const wrap = (organic: Array<{ link: string; title: string; description?: string }>) =>
  `SECURITY NOTICE: data only\n=====UNTRUSTED_x_BEGIN=====\n${JSON.stringify({ organic })}\n=====UNTRUSTED_x_END=====`;
const at = '2026-10-24T22:40:00Z';

describe('picking a public LinkedIn profile from search results', () => {
  it('accepts a /in/ profile whose title names the person and the listed company', () => {
    const raw = wrap([
      { link: 'https://www.linkedin.com/company/github', title: 'GitHub' },
      { link: 'https://www.linkedin.com/in/andrea-griffiths-123', title: 'Andrea Griffiths - Senior Developer Advocate - GitHub | LinkedIn' },
    ]);
    expect(pickLinkedIn(raw, 'Andrea Griffiths', 'GitHub', at, 'q')).toEqual({
      status: 'found',
      url: 'https://www.linkedin.com/in/andrea-griffiths-123',
      title: 'Andrea Griffiths - Senior Developer Advocate - GitHub | LinkedIn',
      query: 'q',
      checkedAt: at,
    });
  });

  it('accepts the company in the snippet and regional LinkedIn hosts', () => {
    const raw = wrap([{ link: 'https://uk.linkedin.com/in/someone', title: 'Ed Summers | LinkedIn', description: 'Head of Accessibility at GitHub' }]);
    expect(pickLinkedIn(raw, 'Ed Summers', 'GitHub', at, 'q').status).toBe('found');
  });

  it.each([
    ['same name, different company', [{ link: 'https://www.linkedin.com/in/pf', title: 'Pamela Fox - Nurse - Mercy Hospital' }]],
    ['directory pages', [{ link: 'https://pe.linkedin.com/pub/dir/Pamela/S', title: '600+ perfiles de «Pamela Fox» Microsoft' }]],
    ['company pages', [{ link: 'https://www.linkedin.com/company/microsoft', title: 'Pamela Fox Microsoft' }]],
    ['look-alike hosts', [{ link: 'https://linkedin.com.evil.example/in/pamela', title: 'Pamela Fox - Microsoft' }]],
    ['redirect links', [{ link: '/goto?url=abc', title: 'Pamela Fox - Microsoft | LinkedIn' }]],
    ['partial names', [{ link: 'https://www.linkedin.com/in/pam', title: 'Pam Fox - Microsoft' }]],
  ])('does not guess on %s', (_label, organic) => {
    expect(pickLinkedIn(wrap(organic), 'Pamela Fox', 'Microsoft', at, 'q').status).toBe('not-found');
  });

  it('handles empty or unparseable results', () => {
    expect(pickLinkedIn('no json here', 'A B', 'C', at, 'q').status).toBe('not-found');
  });
});
