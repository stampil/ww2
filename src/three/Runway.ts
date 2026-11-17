/** Where the runway lies: always straight, east and west, on one row. */
export class Runway {
  constructor(
    readonly row: number,
    readonly firstColumn: number,
    readonly length: number,
  ) {}

  lastColumn(): number {
    return this.firstColumn + this.length - 1
  }

  covers(row: number, column: number): boolean {
    return row === this.row && column >= this.firstColumn && column <= this.lastColumn()
  }
}
