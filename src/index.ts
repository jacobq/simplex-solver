import * as _ from 'lodash';
import * as Equation from 'Simplex/equation';

// TODO: Move to a better spot
interface Variable {
  name: string;
  coefficient: number;
}

interface Equation {
  lhs: any[];
  rhs: any[];
  operator: string;
}

function determineVariables(equations: Equation[]) {
  return _.chain(equations).map('lhs').flatten().map('name').compact().uniq().value();
}

function determineCoefficients(equations: Equation[], variables: Variable[]) {
  const slackRows = _.range(1, equations.length); // [ 1, 2, ..., equations.length ]
  return _.map(equations, (equation, row: number) => {
    const coefficients = _.map(variables, function(v) {
      const variable = _.find(equation.lhs, [ 'name', v.name ]);
      return variable ? variable.coefficient : 0;
    });
    const slacks = _.map(slackRows, slackRow => (row === slackRow ? 1 : 0));
    return coefficients.concat(slacks, equation.rhs);
  });
}

module.exports = {
  maximize: function(objective, constraints) {

    function addTableau(pivot) {
      // Determine all the variables
      const slackVariables = _.times(rows - 1, function(index) { return 's' + (index + 1); });
      const allVariables = variables.concat(slackVariables, ['rhs']);

      // Create the tableau
      tableaus.push({
        variables: allVariables,
        rows: _.map(coefficients, _.clone),
        pivot: pivot
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

    function determineSolution() {
      // Add to the list of tableaus
      addTableau(undefined);

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
        tableaus: tableaus
      });
    }

    // Format the Equations
    const objectiveEq = Equation.parse('max = ' + objective);
    const constraintEqs = _.chain(constraints).map(Equation.parse).map(Equation.toMaximizations).flatten().value();
    const equations = [objectiveEq].concat(constraintEqs);
    _.each(equations, Equation.normalize);

    // Create the matrix
    const variables = determineVariables(equations);
    const coefficients = determineCoefficients(equations, variables);
    const rows = constraintEqs.length + 1;
    const columns = coefficients[0].length;
    const tableaus = [];

    // Run Phase 1 (get the negative right hand sides out)
    while (runPhase1());
    if (!isFeasible()) return;

    // Run Phase 2 (optimize!)
    while (runPhase2());
    return determineSolution();
  }
}
