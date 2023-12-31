export class Ship {
  startX: number | null;
  startY: number | null;

  size: number;
  direction!: string;
  div: HTMLDivElement;
  killed = false;

  x: number | null;
  y: number | null;

  constructor(size: number, direction: string, startX: number | null = null, startY: number | null = null) {
    this.startX = startX;
    this.startY = startY;
    this.size = size;
    this.div = document.createElement('div');
    this.div.classList.add('ship');
    this.setDirection(direction);
    this.x = null;
    this.y = null;
  }

  get placed() {
    return this.x !== null && this.y !== null;
  }

  setDirection(newDirection: string) {
    this.div.classList.remove(`ship-${this.direction}-${this.size}`);
    this.direction = newDirection;
    this.div.classList.add(`ship-${this.direction}-${this.size}`);

    return true;
  }

  toggleDirection() {
    const newDirection = this.direction === 'row' ? 'column' : 'row';
    this.setDirection(newDirection);
  }
}
