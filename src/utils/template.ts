import mustache from 'mustache';

const writer = new mustache.Writer();

export const template = (
  tokens: unknown,
  view: Record<string, unknown>
): string =>
  writer.renderTokens(tokens as string[][], new mustache.Context(view));
