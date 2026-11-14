import { cheapestModel, pricing } from './gemini.pricing';

describe('cheapestModel', () => {
  it('when models have different prices, should return the one with the lowest input plus output cost', () => {
    const costs = [...pricing.entries()].map(([name, price]) => ({
      name,
      cost: price.inputPerMillionTokens + price.outputPerMillionTokens,
    }));
    const lowest = Math.min(...costs.map((entry) => entry.cost));

    expect(pricing.has(cheapestModel())).toBe(true);
    expect(costs.find((entry) => entry.name === cheapestModel())?.cost).toBe(
      lowest,
    );
  });
});
