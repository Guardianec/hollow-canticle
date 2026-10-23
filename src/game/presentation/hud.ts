import { World } from '../world';
import { BIOMES } from '../data';
import { ITEMS } from '../items';
import { BUFFS } from '../buffs';
const safe = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );

export class Hud {
  readonly root = document.createElement('div');
  private lastUpdate = 0;
  private lastCharges = 0;
  private restoredUntil = 0;
  constructor(
    parent: HTMLElement,
    private world: World,
  ) {
    this.root.className = 'game-hud';
    parent.append(this.root);
  }
  update(duel: number): void {
    const w = this.world;
    this.root.hidden =
      w.mode === 'menu' || w.mode === 'reward' || w.mode === 'dead' || w.mode === 'trained';
    if (performance.now() - this.lastUpdate < 90) return;
    this.lastUpdate = performance.now();
    const p = w.player,
      e = w.target;
    if (p.rangedCharges > this.lastCharges) this.restoredUntil = w.time + 0.5;
    this.lastCharges = p.rangedCharges;
    const discovered = w.floor.rooms.filter((r) => r.visited);
    const xs = discovered.map((r) => r.x),
      ys = discovered.map((r) => r.y),
      minX = Math.min(...xs) - 2.2,
      minY = Math.min(...ys) - 1.7,
      maxX = Math.max(...xs) + 2.2,
      maxY = Math.max(...ys) + 1.7;
    const map = discovered
      .map(
        (r) =>
          r.links
            .filter((id) => w.floor.rooms[id].kind !== 'secret' || w.floor.rooms[id].visited)
            .map((id) => {
              const n = w.floor.rooms[id],
                end = w.floor.rooms[id].visited
                  ? { x: n.x * 22, y: n.y * 22 }
                  : { x: r.x * 22 + (n.x - r.x) * 11, y: r.y * 22 + (n.y - r.y) * 11 };
              return '<path d="M' + r.x * 22 + ' ' + r.y * 22 + ' L' + end.x + ' ' + end.y + '"/>';
            })
            .join('') +
          '<rect class="' +
          (r.id === w.roomId ? 'current' : '') +
          '" x="' +
          (r.x * 22 - 5) +
          '" y="' +
          (r.y * 22 - 4) +
          '" width="10" height="8"/>' +
          (r.id === w.roomId
            ? '<circle cx="' + r.x * 22 + '" cy="' + r.y * 22 + '" r="1.6"/>'
            : ''),
      )
      .join('');
    const bar = (label: string, value: number, className: string) =>
      '<div class="resource ' +
      className +
      '" role="meter" aria-label="' +
      label +
      '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' +
      Math.round(value) +
      '"><i style="width:' +
      Math.max(0, Math.min(100, value)) +
      '%"></i></div>';
    const toast = w.toast && w.toast.until > w.time ? w.toast : undefined;
    const training = [
      ['move', 'Find your footing', 'WASD to move through the world.'],
      ['attack', 'Press the advantage', 'J / left mouse to strike.'],
      ['parry', 'Meet the blade', 'K / right mouse as a normal strike lands.'],
      ['perfect', 'Find the silver instant', 'Deflect at the last instant for a perfect parry.'],
      ['dodge', 'Leave only a shadow', 'Space evades sweeps, grabs and heavy smashes.'],
      ['finisher', 'Keep your oath', 'Break their guard, approach and press E.'],
      [
        'ranged',
        'Offer silver to the dark',
        'R / middle mouse spends a charge. Charges return one at a time.',
      ],
      ['item', 'Drink between the strikes', 'Q uses a consumable. 1 / 2 cycles your satchel.'],
      ['projectile', 'Deflect the arrow', 'K as an arrow or orb makes contact.'],
      [
        'reflection',
        'Return their oath',
        'Deflect in the final silver instant to reflect it back.',
      ],
    ].find(([id]) => !w.trainingDone.has(id));
    this.root.classList.toggle('duel-hud', duel > 0.5);
    this.root.classList.toggle('finisher-hud', w.player.state === 'finisher');
    this.root.dataset.camera = w.presentation.mode;
    this.root.innerHTML =
      '<div class="vitality"><span class="oath-sigil">⟐</span><div><span class="hud-label">' +
      safe(w.character.name.toUpperCase()) +
      ' <b>' +
      Math.ceil(p.hp) +
      ' / 100</b></span>' +
      bar('Vitality', p.hp, 'hp') +
      bar('Guard', p.posture, 'guard') +
      bar('Focus', p.focus, 'focus') +
      '<small>FOCUS ' +
      Math.floor(p.focus) +
      (p.focus >= 100 ? ' · F RESONANCE' : '') +
      '</small></div></div>' +
      '<div class="floor-map"><div>DEPTH ' +
      String(w.floor.depth).padStart(2, '0') +
      '<small>' +
      BIOMES[w.floor.biome].short.toUpperCase() +
      '</small></div><svg viewBox="' +
      minX * 22 +
      ' ' +
      minY * 22 +
      ' ' +
      (maxX - minX) * 22 +
      ' ' +
      (maxY - minY) * 22 +
      '" aria-label="Discovered dungeon rooms">' +
      map +
      '</svg></div>' +
      (w.combat && e
        ? '<div class="enemy-title"><span>' +
          safe(e.def.name) +
          (e.def.id === 'boss' ? ' · ' + (e.phase === 1 ? 'I' : 'II') : '') +
          '</span>' +
          bar('Enemy vitality', (e.hp / e.maxHp) * 100, 'hp') +
          '<small>' +
          safe(w.room.kind === 'elite' ? e.def.role + ' · ' + w.room.elite : e.def.role) +
          '</small></div><div class="enemy-posture">' +
          bar('Enemy guard', (e.posture / e.maxPosture) * 100, 'guard') +
          '<span>' +
          (e.state === 'broken' ? 'GUARD BROKEN · E' : 'GUARD') +
          '</span></div>'
        : '') +
      (w.prompt
        ? '<div class="context-prompt"><kbd>E</kbd>' + safe(w.prompt.text) + '</div>'
        : '') +
      (toast
        ? '<div class="quiet-toast" style="color:' +
          toast.color +
          '">' +
          safe(toast.text) +
          '<small>' +
          safe(toast.sub) +
          '</small></div>'
        : '') +
      (w.training && training
        ? '<div class="training-note"><small>THE PRACTICE OF STEEL · ' +
          [
            'move',
            'attack',
            'parry',
            'perfect',
            'dodge',
            'finisher',
            'ranged',
            'item',
            'projectile',
            'reflection',
          ].filter((id) => w.trainingDone.has(id)).length +
          '/10</small><strong>' +
          training[1] +
          '</strong><p>' +
          training[2] +
          '</p></div>'
        : '') +
      '<div class="equipped-weapon">' +
      safe(w.weapon.name) +
      '<small>' +
      w.relics.map((r) => '<span title="' + safe(r.name) + '">' + r.glyph + '</span>').join('') +
      '</small></div>';
    const ranged = w.character.ranged;
    this.root.insertAdjacentHTML(
      'beforeend',
      `<div class="arsenal-hud"><div class="charge-title">${safe(ranged.name)} <kbd>R</kbd></div><div class="ranged-charges" aria-label="${p.rangedCharges} of ${ranged.charges} ranged charges">${Array.from({ length: ranged.charges }, (_, i) => `<span class="${i < p.rangedCharges ? 'full' : ''} ${i === p.rangedCharges - 1 && w.time < this.restoredUntil ? 'restored' : ''}">${ranged.kind === 'wave' ? '⌁' : ranged.kind === 'javelin' ? '↟' : ranged.kind === 'knife' ? '╱' : '†'}${i === p.rangedCharges ? `<i style="height:${(p.recharge / ranged.recharge) * 100}%"></i>` : ''}</span>`).join('')}</div><div class="satchel"><kbd>Q</kbd> ${safe(w.inventory.item?.name ?? 'Satchel empty')} ${w.inventory.item ? `×${w.inventory.slots[w.inventory.selected].count}` : ''}<small>1 / 2 · ${w.inventory.count}/5 offerings</small></div><div class="active-buffs">${w.buffs.active
        .slice(-5)
        .map((b) => {
          const def = BUFFS.find((d) => d.id === b.id)!;
          const remaining = Math.max(0, b.startedAt + b.duration - w.time);
          return `<span title="${safe(def.name)} · ${Math.ceil(remaining)}s">${def.glyph}<small>${Math.ceil(remaining)}</small><i style="width:${(remaining / b.duration) * 100}%"></i></span>`;
        })
        .join('')}</div></div>`,
    );
    const pickup = w.pickups.find(
      (i) =>
        i.room === w.roomId && i.depth === w.floor.depth && Math.hypot(i.x - p.x, i.y - p.y) < 85,
    );
    if (pickup)
      this.root.insertAdjacentHTML(
        'beforeend',
        `<div class="pickup-detail">${safe(ITEMS.find((i) => i.id === pickup.item)!.description)}</div>`,
      );
  }
}
