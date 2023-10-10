import { Application } from '../Application';
import { Scene } from '../Scene';
import { Ship } from '../Ship';
import { matrixItem } from '../types';
import { addListener, getRandomSeveral, isUnderPoint } from '../utils';

const shipDatas = [
  { size: 4, direction: 'row', startX: 10, startY: 345 },
  { size: 3, direction: 'row', startX: 10, startY: 390 },
  { size: 3, direction: 'row', startX: 120, startY: 390 },
  { size: 2, direction: 'row', startX: 10, startY: 435 },
  { size: 2, direction: 'row', startX: 88, startY: 435 },
  { size: 2, direction: 'row', startX: 167, startY: 435 },
  { size: 1, direction: 'row', startX: 10, startY: 480 },
  { size: 1, direction: 'row', startX: 55, startY: 480 },
  { size: 1, direction: 'row', startX: 100, startY: 480 },
  { size: 1, direction: 'row', startX: 145, startY: 480 },
];

export class PreparationScene extends Scene {
  draggedShip: Ship | null = null;
  draggedOffsetX = 0;
  draggedOffsetY = 0;
  //!!!???
  removeEventListeners: any[] = [];

  constructor(name: string, app: Application) {
    super(name, app)
    this.manually();
  }

  start() {
    const { player, opponent } = this.app;

    opponent.clear();
    player.removeAllShots();
    player.ships.forEach((ship) => (ship.killed = false));

    this.removeEventListeners = [];

    document.querySelectorAll('.app-actions').forEach((element) => element.classList.add('hidden'));

    document.querySelector('[data-scene="preparation"]')!.classList.remove('hidden');

    const manuallyButton = document.querySelector('[data-action="manually"]');
    const randomizeButton = document.querySelector('[data-action="randomize"]');
    const simpleButton = document.querySelector('[data-computer="simple"]');
    const middleButton = document.querySelector('[data-computer="middle"]');
    const hardButton = document.querySelector('[data-computer="hard"]');
    const randomButton = document.querySelector('[data-type="random"]');
    const challengeButton = document.querySelector('[data-type="challenge"]');
    const takeChallengeButton = document.querySelector('[data-type="takeChallenge"]');

    this.removeEventListeners.push(addListener(manuallyButton, 'click', () => this.manually()));

    this.removeEventListeners.push(addListener(randomizeButton, 'click', () => this.randomize()));

    this.removeEventListeners.push(addListener(simpleButton, 'click', () => this.startComputer('simple')));

    this.removeEventListeners.push(addListener(middleButton, 'click', () => this.startComputer('middle')));

    this.removeEventListeners.push(addListener(hardButton, 'click', () => this.startComputer('hard')));

    this.removeEventListeners.push(addListener(randomButton, 'click', () => this.app.start('online', 'random')));

    this.removeEventListeners.push(addListener(challengeButton, 'click', () => this.app.start('online', 'challenge')));

    this.removeEventListeners.push(
      addListener(takeChallengeButton, 'click', () => {
        const key = prompt('Ключ партии:');
        this.app.start('online', 'challenge', key);
      }),
    );
  }

  stop() {
    for (const removeEventListener of this.removeEventListeners) {
      removeEventListener();
    }

    this.removeEventListeners = [];
  }

  update() {
    const { mouse, player } = this.app;

    // Потенциально хотим начать тянуть корабль
    if (!this.draggedShip && mouse.left && !mouse.pLeft) {
      const ship = player.ships.find((ship) => ship.isUnder(mouse));

      if (ship) {
        const shipRect = ship.div.getBoundingClientRect();

        this.draggedShip = ship;
        this.draggedOffsetX = mouse.x - shipRect.left;
        this.draggedOffsetY = mouse.y - shipRect.top;

        ship.x = null;
        ship.y = null;
      }
    }

    // Перетаскивание
    if (mouse.left && this.draggedShip) {
      const { left, top } = player.root.getBoundingClientRect();
      const x = mouse.x - left - this.draggedOffsetX;
      const y = mouse.y - top - this.draggedOffsetY;

      this.draggedShip.div.style.left = `${x}px`;
      this.draggedShip.div.style.top = `${y}px`;
    }

    // Бросание
    if (!mouse.left && this.draggedShip) {
      const ship = this.draggedShip;
      this.draggedShip = null;

      const { left, top } = ship.div.getBoundingClientRect();
      const { width, height } = player.cells[0][0].getBoundingClientRect();

      const point = {
        x: left + width / 2,
        y: top + height / 2,
      };

      const cell = player.cells.flat().find((cell) => isUnderPoint(point, cell));

      if (cell) {
        const x = parseInt(cell.dataset.x!);
        const y = parseInt(cell.dataset.y!);

        player.removeShip(ship);
        player.addShip(ship, x, y);
      } else {
        player.removeShip(ship);
        //!!!???
        player.addShip(ship);
      }
    }

    // Врощаение
    if (this.draggedShip && mouse.delta) {
      this.draggedShip.toggleDirection();
    }

    if (player.complete) {
      (document.querySelector('[data-computer="simple"]') as HTMLButtonElement).disabled = false;
      (document.querySelector('[data-computer="middle"]') as HTMLButtonElement).disabled = false;
      (document.querySelector('[data-computer="hard"]') as HTMLButtonElement).disabled = false;
      (document.querySelector('[data-type="random"]') as HTMLButtonElement).disabled = false;
      (document.querySelector('[data-type="challenge"]') as HTMLButtonElement).disabled = false;
      (document.querySelector('[data-type="takeChallenge"]') as HTMLButtonElement).disabled = false;
    } else {
      (document.querySelector('[data-computer="simple"]') as HTMLButtonElement).disabled = true;
      (document.querySelector('[data-computer="middle"]') as HTMLButtonElement).disabled = true;
      (document.querySelector('[data-computer="hard"]') as HTMLButtonElement).disabled = true;
      (document.querySelector('[data-type="random"]') as HTMLButtonElement).disabled = true;
      (document.querySelector('[data-type="challenge"]') as HTMLButtonElement).disabled = true;
      (document.querySelector('[data-type="takeChallenge"]') as HTMLButtonElement).disabled = true;
    }
  }

  randomize() {
    const { player } = this.app;
    //!!!???
    player.randomize();

    for (let i = 0; i < 10; i++) {
      const ship = player.ships[i];

      ship.startX = shipDatas[i].startX;
      ship.startY = shipDatas[i].startY;
    }
  }

  manually() {
    const { player } = this.app;

    player.removeAllShips();

    for (const { size, direction, startX, startY } of shipDatas) {
      const ship = new Ship(size, direction, startX, startY);
      //!!!???
      player.addShip(ship);
    }
  }

  startComputer(level: any) {
    const matrix = this.app.player.matrix;
    const withoutShipItems = matrix.flat().filter((item: any) => !item.ship);
    let untouchables: matrixItem[] = [];

    if (level === 'simple') {
    } else if (level === 'middle') {
      untouchables = getRandomSeveral(withoutShipItems, 20);
    } else if (level === 'hard') {
      untouchables = getRandomSeveral(withoutShipItems, 40);
    }
    this.app.start('computer', untouchables);
  }
}
