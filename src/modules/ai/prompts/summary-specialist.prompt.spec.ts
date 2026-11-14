import {
  buildSummaryPrompt,
  DEFAULT_SUMMARY_DETAIL,
  isSummaryDetail,
  SummarySpecialistPrompt,
  SUMMARY_DETAILS,
} from './summary-specialist.prompt';

describe('buildSummaryPrompt', () => {
  it('when the detail is brief, should return the original prompt', () => {
    expect(buildSummaryPrompt('brief')).toBe(SummarySpecialistPrompt);
  });

  it('when the detail is detailed, should replace only the detail section', () => {
    const prompt = buildSummaryPrompt('detailed');

    expect(prompt).toContain('**detalhado**');
    expect(prompt).not.toContain('significativamente mais conciso');
    expect(prompt).toContain('# PROCESSOS, ETAPAS E COMPARAÇÕES');
    expect(prompt).toContain('# PRINCÍPIO FUNDAMENTAL');
    expect(prompt.endsWith('### Conteúdo a ser resumido:\n\n')).toBe(true);
  });

  it('when the detail is study, should add the study structure', () => {
    const prompt = buildSummaryPrompt('study');

    expect(prompt).toContain('material de estudo e de consulta');
    expect(prompt).toContain('# ESTRUTURA DE ESTUDO');
    expect(prompt).toContain('Para revisar');
    expect(prompt).not.toContain('significativamente mais conciso');
  });

  it.each(['detailed', 'study'] as const)(
    'when the detail is %s, should keep the fidelity rules',
    (detail) => {
      expect(buildSummaryPrompt(detail)).toContain(
        '**Se uma informação não estiver presente na fonte, não a inclua.**',
      );
    },
  );
});

describe('isSummaryDetail', () => {
  it.each(SUMMARY_DETAILS)(
    'when the value is %s, should accept it',
    (value) => {
      expect(isSummaryDetail(value)).toBe(true);
    },
  );

  it.each(['', 'huge', undefined, null, 1])(
    'when the value is %p, should reject it',
    (value) => {
      expect(isSummaryDetail(value)).toBe(false);
    },
  );

  it('when no detail is chosen, should default to detailed', () => {
    expect(DEFAULT_SUMMARY_DETAIL).toBe('detailed');
  });
});
