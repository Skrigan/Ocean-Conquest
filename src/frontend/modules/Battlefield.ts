import { Ship } from './Ship';
import { Shot } from './Shot';
import { MatrixItem, Point } from './types';
import { getRandomBetween, getRandomFrom } from './utils';

const angles: Point[] = [
  { x: -1, y: 1 },
  { x: 1, y: 1 },
  { x: -1, y: -1 },
  { x: 1, y: -1 },
];

const sides: Point[] = [
  { x: 0, y: 1 },
  { x: 1, y: 0 },
  { x: 0, y: -1 },
  { x: -1, y: 0 },
];

export class Battlefield {
  ships: Ship[] = [];
  shots: Shot[] = [];
  root: HTMLDivElement;
  table: HTMLTableElement;
  dock: HTMLDivElement;
  polygon: HTMLDivElement;
  showShips: boolean;

  cells: HTMLTableCellElement[][] = [];

  constructor(showShips = true) {
    this.root = document.createElement('div');
    this.table = document.createElement('table');
    this.dock = document.createElement('div');
    this.polygon = document.createElement('div');
    this.showShips = showShips;

    const { root, table, dock, polygon } = this;

    root.classList.add('battlefield');
    table.classList.add('battlefield-table');
    dock.classList.add('battlefield-dock');
    polygon.classList.add('battlefield-polygon');

    root.append(table, dock, polygon);

    for (let y = 0; y < 10; y++) {
      const row: HTMLTableCellElement[] = [];
      const tr = document.createElement('tr');
      tr.classList.add('battlefield-row');
      tr.dataset.y = String(y);

      for (let x = 0; x < 10; x++) {
        const td = document.createElement('td');
        td.classList.add('battlefield-item');
        Object.assign(td.dataset, { x, y });

        tr.append(td);
        row.push(td);
      }

      table.append(tr);
      this.cells.push(row);
    }

    for (let x = 0; x < 10; x++) {
      const cell = this.cells[0][x];
      const marker = document.createElement('div');

      marker.classList.add('marker', 'marker-column');
      marker.textContent = 'ABCDEFGHIJ'[x];

      cell.append(marker);
    }

    for (let y = 0; y < 10; y++) {
      const cell = this.cells[y][0];
      const marker = document.createElement('div');

      marker.classList.add('marker', 'marker-row');
      marker.textContent = String(y + 1);

      cell.append(marker);
    }
  }

  get loser() {
    for (const ship of this.ships) {
      if (!ship.killed) {
        return false;
      }
    }

    return true;
  }

  get matrix() {
    const matrix: MatrixItem[][] = [];

    for (let y = 0; y < 10; y++) {
      const row = [];

      for (let x = 0; x < 10; x++) {
        const item: MatrixItem = {
          x,
          y,
          ship: null,
          free: true,
          shotted: false,
          wounded: false,
        };

        row.push(item);
      }

      matrix.push(row);
    }

    for (const ship of this.ships) {
      if (!ship.placed) {
        continue;
      }

      const { x, y } = ship;
      const dx = ship.direction === 'row';
      const dy = ship.direction === 'column';

      for (let i = 0; i < ship.size; i++) {
        const cx = x! + Number(dx) * i;
        const cy = y! + Number(dy) * i;

        const item = matrix[cy][cx];
        item.ship = ship;
      }

      // inner loop counts rows
      // the outer loop counts the columns
      for (let y = ship.y! - 1; y < ship.y! + ship.size * Number(dy) + Number(dx) + 1; y++) {
        for (let x = ship.x! - 1; x < ship.x! + ship.size * Number(dx) + Number(dy) + 1; x++) {
          if (this.inField(x, y)) {
            const item = matrix[y][x];
            item.free = false;
          }
        }
      }
    }

    for (const { x, y } of this.shots) {
      const item = matrix[y][x];
      item.shotted = true;

      if (item.ship) {
        item.wounded = true;
      }
    }
    return matrix;
  }

  get complete() {
    if (this.ships.length !== 10) {
      return false;
    }

    for (const ship of this.ships) {
      if (!ship.placed) {
        return false;
      }
    }

    return true;
  }

  addShip(ship: Ship, x?: number, y?: number) {
    this.ships.push(ship);
    const matrix = this.matrix;

    if (x !== undefined && y !== undefined && this.inField(x, y)) {
      const dx = ship.direction === 'row';
      const dy = ship.direction === 'column';

      let placed = true;

      for (let i = 0; i < ship.size; i++) {
        const cx = x! + Number(dx) * i;
        const cy = y! + Number(dy) * i;

        if (!this.inField(cx, cy)) {
          placed = false;
          break;
        }

        const item = matrix[cy][cx];
        if (!item.free) {
          placed = false;
          break;
        }
      }

      if (placed) {
        Object.assign(ship, { x, y });
      }
    }

    if (this.showShips) {
      this.dock.append(ship.div);

      if (ship.placed) {
        const cell = this.cells[y!][x!];
        const cellRect = cell.getBoundingClientRect();
        const rootRect = this.root.getBoundingClientRect();

        ship.div.style.left = `${cellRect.left - rootRect.left}px`;
        ship.div.style.top = `${cellRect.top - rootRect.top}px`;
      } else {
        ship.setDirection('row');
        ship.div.style.left = `${ship.startX}px`;
        ship.div.style.top = `${ship.startY}px`;
      }
    }

    return true;
  }

  removeShip(ship: Ship) {
    if (!this.ships.includes(ship)) {
      return false;
    }

    const index = this.ships.indexOf(ship);
    this.ships.splice(index, 1);

    if (Array.prototype.includes.call(this.dock.children, ship.div)) {
      ship.div.remove();
    }

    return true;
  }

  removeAllShips() {
    const ships = this.ships.slice();
    for (const ship of ships) {
      this.removeShip(ship);
    }

    return ships.length;
  }

  addShot(shot: Shot) {
    for (const { x, y } of this.shots) {
      if (x === shot.x && y === shot.y) {
        return false;
      }
    }

    this.shots.push(shot);

    const matrix = this.matrix;
    const { x, y } = shot;

    if (matrix[y][x].ship) {
      shot.setVariant('wounded');

      for (const angle of angles) {
        const aX = x + angle.x;
        const aY = y + angle.y;
        if (this.inField(aX, aY)) {
          const shot = new Shot(aX, aY);
          shot.setVariant('miss');
          this.addShot(shot);
        }
      }

      const ship = matrix[y][x].ship!;
      const dx = ship.direction === 'row';
      const dy = ship.direction === 'column';

      let killed = true;

      for (let i = 0; i < ship.size; i++) {
        const cx = ship.x! + Number(dx) * i;
        const cy = ship.y! + Number(dy) * i;
        const item = matrix[cy][cx];

        if (!item.wounded) {
          killed = false;
          break;
        }
      }

      if (killed) {
        ship.killed = true;

        for (let i = 0; i < ship!.size; i++) {
          const cx = ship!.x! + Number(dx) * i;
          const cy = ship!.y! + Number(dy) * i;

          if (i === 0 || i === ship.size - 1) {
            for (const side of sides) {
              const sX = cx + side.x;
              const sY = cy + side.y;
              if (this.inField(sX, sY)) {
                const shot = new Shot(sX, sY);
                shot.setVariant('miss');
                this.addShot(shot);
              }
            }
          }

          const shot = this.shots.find((shot) => shot.x === cx && shot.y === cy);
          shot!.setVariant('killed');
        }
      }
    }

    const cell = this.cells[shot.y][shot.x];
    const cellRect = cell.getBoundingClientRect();
    const rootRect = this.root.getBoundingClientRect();

    shot.div.style.left = `${cellRect.left - rootRect.left}px`;
    shot.div.style.top = `${cellRect.top - rootRect.top}px`;

    this.polygon.append(shot.div);

    return true;
  }

  removeShot(shot: Shot) {
    if (!this.shots.includes(shot)) {
      return false;
    }

    const index = this.shots.indexOf(shot);
    this.shots.splice(index, 1);

    if (Array.prototype.includes.call(this.polygon.children, shot.div)) {
      shot.div.remove();
    }

    return true;
  }

  removeAllShots() {
    const shots = this.shots.slice();

    for (const shot of shots) {
      this.removeShot(shot);
    }

    return shots.length;
  }

  randomize() {
    this.removeAllShips();

    for (let size = 4; size >= 1; size--) {
      for (let n = 0; n < 5 - size; n++) {
        const direction = getRandomFrom('row', 'column');
        const ship = new Ship(size, direction);
        while (!ship.placed) {
          const x = getRandomBetween(0, 9);
          const y = getRandomBetween(0, 9);
          this.removeShip(ship);
          this.addShip(ship, x, y);
        }
      }
    }
  }

  clear() {
    this.removeAllShots();
    this.removeAllShips();
  }

  inField(x: number, y: number) {
    return 0 <= x && x < 10 && 0 <= y && y < 10;
  }
}
