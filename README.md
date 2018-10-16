# Simplex Solver

Simplex Solver solves linear programs given an arbitrary number of constraints.
Learn more about the [Simplex Algorithm](https://en.wikipedia.org/wiki/Simplex_algorithm).

## Code Example

To use Simplex Solver in your own application, follow the example below.

    const simplex = require('simplex-solver');

    let result = simplex.maximize('2x + 3y + 4z', [
      '3x + 2y + z <= 10',
      '2x + 5y + 3z <= 15'
    ]);

The example above will yield the following object

    result = { max: 20, x: 0, y: 0, z: 5, tableaus: [...] }

## Install

    npm install --save simplex-solver

## Documentation

### simplex.maximize(equation, constraints)

Maximizes `equation` such that it meets all of the `constraints`.

#### Arguments

- `equation` - A string
- `constraints` - An array of strings. The operator for each constraint can be either `<=`, `>=` or `=`
