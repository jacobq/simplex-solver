import * as _ from 'lodash';
const operators = ['>=', '<=', '='];

function parseVariable(text) {
  const regex = /([.0-9]*)([a-zA-Z][a-zA-Z0-9]*)/;
  const result = text.match(regex);
  if (result) return {
    coefficient: result[1] ? parseFloat(result[1]) : 1,
    name: result[2]
  }
}

// Clone this side of the equation
function cloneSide(equation) {
  return _.map(equation, function(part) {
    if (_.isNumber(part)) return part;
    return _.clone(part);
  });
}

// Clone the equation
function cloneEquation(equation) {
  return {
    lhs: cloneSide(equation.lhs),
    operator: equation.operator,
    rhs: cloneSide(equation.rhs)
  }
}

// Flip the equation on its side
function flip(equation) {
  // Flip sides
  const lhs = equation.lhs;
  const rhs = equation.rhs;
  equation.lhs = rhs;
  equation.rhs = lhs;

  // Flip operator
  if (equation.operator == '<=') equation.operator = '>=';
  if (equation.operator == '>=') equation.operator = '<=';
}

// Go from a string 1x+2y=10 to parsed
function parseSide(equation) {
  const regex = /([+\-*/])/;
  const parts = _.compact(equation.split(regex));
  return _.reduce(parts, function(result, part) {
    if (part === '-') result.sign = -1;
    else if (part === '+') result.sign = 1;
    else {
      const variable = parseVariable(part);
      if (variable) {
        variable.coefficient *= result.sign;
        result.parts.push(variable);
      } else {
        const value = parseFloat(part.toString()) * result.sign;
        result.parts.push(value);
      }
    }
    return result;
  }, {
    sign: 1,
    parts: []
  }).parts;
}

// Go from a string 1x+2y=10 to parsed
export function parse(equation) {
  // Condense content
  equation = equation.replace(/\s+/g, '');

  // Find the operator
  const operator = _.find(operators, function(operator) {
    return equation.indexOf(operator) != -1;
  });
  if (!operator) return;

  // Split the sides
  const sides = equation.split(operator);
  return {
    lhs: parseSide(sides[0]),
    operator: operator,
    rhs: parseSide(sides[1])
  }
}

// Convert to maximization equations
export function toMaximizations(equation) {
  if (equation.operator == '<=') {
    return [equation];
  } else if (equation.operator == '>=') {
    const clone = cloneEquation(equation);
    flip(clone);
    return [clone];
  } else if (equation.operator == '=') {
    const lessThan = cloneEquation(equation);
    lessThan.operator = '<=';
    const greaterThan = cloneEquation(equation);
    greaterThan.operator = '>=';
    flip(greaterThan);
    return [lessThan, greaterThan];
  }
}

// Put all variables on the left and constants on the right
export function normalize(equation) {
  // Move variable from rhs to lhs
  equation.rhs = _.reduce(equation.rhs, function(rhs, part) {
    if (part.name) equation.lhs.push({name: part.name, coefficient: -part.coefficient});
    else rhs.push(part);
    return rhs;
  }, []);

  // Move constants from lhs to rhs
  equation.lhs = _.reduce(equation.lhs, function(lhs, part) {
    if (!part.name) equation.rhs.push(-part);
    else lhs.push(part);
    return lhs;
  }, []);

  // Condense rhs
  equation.rhs = [_.reduce(equation.rhs, function(total, value) {
    return total + value;
  }, 0)];
}

