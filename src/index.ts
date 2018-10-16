import * as _ from 'lodash';
import {
  // Interfaces
  Equation,
  Variable,
  // Functions
  normalize,
  parse,
  toMaximizations,
  equationToString
} from 'Simplex/equation';

import * as debug from 'debug';
import { getBorderCharacters, table as _table } from "table";
const tableDefaultConfig = {
  border: getBorderCharacters('void')
};
const table = (data, config?) => _table(data, Object.assign({}, tableDefaultConfig, config));
const log = debug('simplex-solver:index');

function determineVariables(equations: Equation[]) {
  return _.chain(equations).map('lhs').flatten().map('name').compact().uniq().value();
}


function determineCoefficients(equations: any[], variables: Variable[]) : number[][] {
  const slackRows = _.range(1, equations.length); // [ 1, 2, ..., equations.length ]
  return _.map(equations, (equation, row) => {
    const coefficients = _.map(variables, function(v) {
      const variable = _.find(equation.lhs, [ 'name', v ]);
      return (variable && typeof variable !== 'number') ? variable.coefficient : 0;
    });
    const slacks : number[] = _.map(slackRows, slackRow => (row === slackRow ? 1 : 0));
    return coefficients.concat(slacks, equation.rhs);
  });
}

export function maximize(objective, constraints) {

  const tableaus = [];

  // Format the Equations
  const objectiveEq = parse('max = ' + objective);
  const constraintEqs = _.chain(constraints).map(parse).map(toMaximizations).flatten().value();
  const equations = [objectiveEq].concat(constraintEqs);
  _.each(equations, normalize);
  log('Formatted equations:', JSON.stringify(equations.map(equationToString), null, '  '));

  // Create the matrix
  const variables = determineVariables(equations);
  log('Got variables:', variables);
  const coefficients = determineCoefficients(equations, variables);
  log('Got coefficients:\r\n', table(coefficients));
  const rows = constraintEqs.length + 1;
  const columns = coefficients[0].length;

  function addTableau(pivot?) {
    // Determine all the variables
    const slackVariables = _.times(rows - 1, function(index) { return 's' + (index + 1); });
    const allVariables = variables.concat(slackVariables, ['rhs']);

    // Create the tableau
    tableaus.push({
      variables: allVariables,
      rows: _.map(coefficients, _.clone),
      pivot,
    });
  }

  function performPivot(pivotRow, pivotColumn) {
    // Add to the list of tableaus
    addTableau({row: pivotRow, column: pivotColumn});

    // Convert pivot row coefficient to 1
    const ratio = coefficients[pivotRow][pivotColumn];
    _.times(columns, function(column) {
      coefficients[pivotRow][column] = coefficients[pivotRow][column] / ratio;
    });

    // Convert non-pivot row coefficient to 0
    _.times(rows, function(row) {
      const ratio = coefficients[row][pivotColumn] / coefficients[pivotRow][pivotColumn];
      if (row == pivotRow || ratio == 0) return;

      _.times(columns, function(column) {
        coefficients[row][column] -= ratio * coefficients[pivotRow][column];
      });
    });

    return true;
  }

  function findInfeasibleRow() {
    const rowNumbers = _.range(1, rows);
    return _.find(rowNumbers, function(row) {
      const rowCoefficients = coefficients[row];
      const rhs = rowCoefficients[rowCoefficients.length - 1];
      return rhs < 0;
    });
  }

  function findInfeasibleColumn(pivotRow) {
    const columns = _.range(1, variables.length);
    return _.find(columns, function(column) {
      const coefficient = coefficients[pivotRow][column];
      return coefficient < 0;
    });
  }

  function runPhase1() {
    const pivotRow = findInfeasibleRow();
    let pivotColumn;
    if (pivotRow) pivotColumn = findInfeasibleColumn(pivotRow);
    if (pivotColumn) return performPivot(pivotRow, pivotColumn);
  }

  function determinePivotColumn() {
    const columnNumbers = _.range(1, columns - 1);
    return _.reduce(columnNumbers, (result: { column?: number, coefficient?: number }, column) => {
      const coefficient = coefficients[0][column];

      if (coefficient < 0 && (!result.coefficient || coefficient < result.coefficient)) {
        result = { column, coefficient };
      }
      return result;
    }, {
      column: null,
      coefficient: null
    }).column;
  }

  function determinePivotRow(pivotColumn) {
    const rowNumbers = _.range(1, rows);
    const row = _.reduce(rowNumbers, (result: any, row: any) => {
      const rowCoefficients = coefficients[row];
      const rhs = rowCoefficients[rowCoefficients.length - 1];
      const coefficient = rowCoefficients[pivotColumn];
      const ratio = rhs / coefficient;

      if (coefficient > 0 && ratio >= 0 && (!result.ratio || ratio < result.ratio)) {
        result = { ratio, row };
      }
      return result;
    }, {
      ratio: null,
      row: null,
    }).row;

    return row;
  }

  function runPhase2() {
    const pivotColumn = determinePivotColumn();
    let pivotRow;
    if (pivotColumn) pivotRow = determinePivotRow(pivotColumn);
    if (pivotRow) return performPivot(pivotRow, pivotColumn);
  }

  function isFeasible() {
    return !findInfeasibleRow();
  }

  function determineSolution() : any {
    // Add to the list of tableaus
    addTableau();

    // Pull out all the variables
    return _.reduce(variables, function(result, variable, column) {
      const values = _.times(rows, function(row) {
        return coefficients[row][column];
      });

      const zeros = _.filter(values, function(value) { return value == 0; }).length;
      const ones = _.filter(values, function(value) { return value == 1; }).length;
      let row;
      if (ones == 1 && zeros == values.length - 1) row = _.indexOf(values, 1);

      result[variable] = row != undefined ? coefficients[row][columns - 1] : 0;
      return result;
    }, {
      tableaus
    });
  }



  // Run Phase 1 (get the negative right hand sides out)
  while (runPhase1());
  log('Finished running "phase 1" -- tableaus =', tableaus);
  if (!isFeasible()) return;

  // Run Phase 2 (optimize!)
  while (runPhase2());
  log('Finished running "phase 2" -- tableaus =', tableaus);
  return determineSolution();
}

/* TODO: Needed?
module.exports = {
  maximize
};
*/
