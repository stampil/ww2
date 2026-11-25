export type Point = { x: number; y: number }

// How many cells wide the map is cut into to find the line; the rows follow from the shape of the map.
const COLUMNS = 120

/** How far a point is from the nearest of some places. */
function distanceToNearest(point: Point, places: Point[]): number {
  let nearest = Infinity
  for (const place of places) {
    nearest = Math.min(nearest, Math.hypot(point.x - place.x, point.y - place.y))
  }

  return nearest
}

/**
 * The front line between the camps of two sides, as lines to draw: the points of the map that are as far from the nearest camp of the one side as from the nearest camp of the other.
 * The map is cut into cells, the line is found where the difference of the two distances changes sign, and the pieces are joined end to end. There is no line unless both sides hold a camp.
 */
export function frontLine(first: Point[], second: Point[], width: number, height: number): Point[][] {
  if (first.length === 0 || second.length === 0) {
    return []
  }
  const rows = Math.round((COLUMNS * height) / width)
  const stepX = width / COLUMNS
  const stepY = height / rows
  // Above zero where a point is nearer to a camp of the first side than to one of the second.
  const field: number[][] = []
  for (let row = 0; row <= rows; row += 1) {
    const line: number[] = []
    for (let column = 0; column <= COLUMNS; column += 1) {
      const point = { x: column * stepX, y: row * stepY }
      line.push(distanceToNearest(point, second) - distanceToNearest(point, first))
    }
    field.push(line)
  }

  // The line crosses an edge between two corners of the cells where their signs differ: a horizontal edge is named h, a vertical one v, by its first corner.
  const positions = new Map<string, Point>()
  const crossing = (column: number, row: number, isHorizontal: boolean): string | null => {
    const otherColumn = isHorizontal ? column + 1 : column
    const otherRow = isHorizontal ? row : row + 1
    const here = field[row][column]
    const there = field[otherRow][otherColumn]
    if (here > 0 === there > 0) {
      return null
    }
    const key = `${isHorizontal ? 'h' : 'v'}${column},${row}`
    const share = here / (here - there)
    positions.set(key, { x: (column + (isHorizontal ? share : 0)) * stepX, y: (row + (isHorizontal ? 0 : share)) * stepY })

    return key
  }

  const links = new Map<string, string[]>()
  const join = (from: string, to: string): void => {
    links.set(from, [...(links.get(from) ?? []), to])
    links.set(to, [...(links.get(to) ?? []), from])
  }
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < COLUMNS; column += 1) {
      const top = crossing(column, row, true)
      const bottom = crossing(column, row + 1, true)
      const left = crossing(column, row, false)
      const right = crossing(column + 1, row, false)
      const crossed = [top, left, bottom, right].filter((key): key is string => key !== null)
      // Four crossings are a saddle, where two lines pass in one cell: they are told apart arbitrarily.
      for (let pair = 0; pair + 1 < crossed.length; pair += 2) {
        join(crossed[pair], crossed[pair + 1])
      }
    }
  }

  const visited = new Set<string>()
  const lines: Point[][] = []
  const openEnds = [...links.keys()].filter((key) => links.get(key)!.length === 1)
  for (const start of [...openEnds, ...links.keys()]) {
    const line: Point[] = []
    let current: string | undefined = start
    while (current !== undefined && !visited.has(current)) {
      visited.add(current)
      line.push(positions.get(current)!)
      current = links.get(current)!.find((next) => !visited.has(next))
    }
    if (line.length > 1) {
      lines.push(line)
    }
  }

  return lines
}
