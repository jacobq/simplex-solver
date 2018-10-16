import * as _ from 'lodash';
import { expect } from 'chai';
import {
    normalize,
    parse,
    toMaximizations,
} from 'Simplex/equation';


describe('Equation', function() {

  describe('normalize', function() {
    it('should move all terms to the left-hand-side', function () {
      const equation = parse('x = y + 2z');
      normalize(equation);
      expect(equation.lhs).to.eql([
        { name: 'x', coefficient: 1 },
        { name: 'y', coefficient: -1 },
        { name: 'z', coefficient: -2 },
      ]);
      expect(equation.operator).to.eql('=');
      expect(equation.rhs).to.eql([ 0 ]);
    });
  });

  describe('parse', function() {
    it('should parse an equation', function () {
      const input = '2x + 3y - 4z <= 5';
      const result = parse(input);
      expect(result.lhs).to.eql([
          { name: 'x', coefficient: 2 },
          { name: 'y', coefficient: 3 },
          { name: 'z', coefficient: -4 },
      ]);
      expect(result.operator).to.eql('<=');
      expect(result.rhs).to.eql([5]);
    });
  });

  describe('toMaximizations', function() {
    it('should convert an equation from ">= form" to "<= form"', function () {
      const equation = parse('x + y - z >= 10'); // --> '10 <= x + y - z'
      const maxEqs = toMaximizations(equation);
      const maxEq = maxEqs[0];
      expect(maxEq.rhs).to.eql([
        { name: 'x', coefficient: 1 },
        { name: 'y', coefficient: 1 },
        { name: 'z', coefficient: -1 },
      ]);
      expect(maxEq.operator).to.eql('<=');
      expect(maxEq.lhs).to.eql([ 10 ]);
    });
  });
});